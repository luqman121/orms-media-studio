// POST /api/generate/video
// Submits an async video job to OpenRouter, then enqueues a 'video-poll' BullMQ job
// for the worker process (apps/worker) to poll and download.
// Falls back to the in-process fire-and-forget poller when REDIS_URL is not set (dev).
//
// Phase 2b (Slice 2): the durable, server-authoritative lifecycle is wired here —
// server-side capability validation, server-side credit estimate, idempotent
// Generation creation, durable RunEvents with monotonic seq, exactly-once reserve
// (and refund on failure), and dispatch to the worker / in-process poller which each
// settle on success or refund on failure. The worker and poller write IDENTICAL
// RunEvents through @orms/generation-runtime.
import * as orouter from '@orms/openrouter';
import { prisma } from '@orms/db';
import { estimateCredits, findModelDefinition, normalizeError } from '@orms/model-router';
import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth';
import { parseRequest, json, handleError, PROVIDER_CODE_TO_CATALOG_KEY } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import { enqueueVideoJob } from '@/lib/queue';
import { pollAndDownloadVideo } from '@/lib/videoPoll';
import { checkVideoRateLimit } from '@/lib/ratelimit';
import { reserveCredits, refundCredits, InsufficientCreditsError } from '@/lib/credits';
import { appendRunEvent } from '@/lib/run-events';
import { assertReferenceCapability, assertSupportedControls } from '@/lib/model-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VIDEO_OPTIONAL_CONTROLS = ['duration', 'resolution', 'aspect_ratio', 'size'] as const;

export async function POST(req: Request) {
  const t0 = Date.now();
  let userId: number | null = null;
  let recordId: number | null = null;
  // Credit reconciliation guard for the outer catch: once we reserve credits we MUST
  // either settle or refund exactly once before returning. These track that obligation.
  let reservedCredits = 0;
  let creditsReconciled = false;
  // The generation idempotency key — keys reserve/settle/refund on the ledger.
  let idempotencyKey = '';
  try {
    userId = requireAuth(req);
    const rl = await checkVideoRateLimit(userId);
    if (!rl.allowed) {
      const t = await getTranslations('errors');
      return Response.json(
        { error: t('generic.rateLimited'), remaining: rl.remaining },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(0, Math.ceil((rl.reset - Date.now()) / 1000))),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }
    const { fields, file } = await parseRequest(req);
    if (
      typeof fields.model !== 'string' ||
      fields.model.trim() === '' ||
      typeof fields.prompt !== 'string' ||
      fields.prompt.trim() === ''
    ) {
      throw new LocalizedError({ code: 'generate.modelRequired', status: 400 });
    }
    const modelId = fields.model.trim();

    const params: Record<string, unknown> = { model: modelId, prompt: fields.prompt };
    for (const k of ['duration', 'resolution', 'aspect_ratio', 'size']) {
      const v = fields[k];
      if (v !== undefined && v !== '') {
        if (k === 'duration') {
          const num = Number(v);
          if (!Number.isNaN(num)) params[k] = num;
        } else {
          params[k] = v;
        }
      }
    }

    // Ownership validation: if a projectId is referenced, it must belong to this user.
    // (projectId is reserved for Phase 4 Projects; validated defensively today.)
    const projectIdRaw = fields.projectId;
    let projectId: number | null = null;
    if (projectIdRaw != null && projectIdRaw !== '') {
      const parsedProjectId = Number(projectIdRaw);
      if (!Number.isInteger(parsedProjectId) || parsedProjectId <= 0) {
        throw new LocalizedError({ code: 'generate.projectInvalid', status: 400 });
      }
      projectId = parsedProjectId;
    }
    if (projectId != null) {
      const proj = await prisma.project.findFirst({ where: { id: projectId, userId } });
      if (!proj) {
        throw new LocalizedError({ code: 'generate.projectNotOwned', status: 403 });
      }
    }

    // Server-side capability validation via @orms/model-router (never trust the client).
    let modelDef;
    try {
      modelDef = await findModelDefinition(modelId);
    } catch (error) {
      throw normalizeError(error);
    }
    if (!modelDef || !modelDef.enabled || modelDef.mediaType !== 'video') {
      throw new LocalizedError({ code: 'generate.modelNotVideo', status: 400 });
    }

    const suppliedControls = VIDEO_OPTIONAL_CONTROLS.filter(
      (control) => fields[control] !== undefined && fields[control] !== '',
    );
    assertSupportedControls(modelDef, suppliedControls);
    if (file) assertReferenceCapability(modelDef);

    // Server-side credit estimate (integer units). Video cost scales with duration.
    const durationSeconds = params.duration == null ? 5 : Number(params.duration);
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > 20) {
      throw new LocalizedError({ code: 'estimate.durationInvalid', status: 400 });
    }

    // Optional first-frame image for image-to-video — inline as base64 only after
    // the model has declared image-to-video support.
    if (file) {
      try {
        const dataUrl = orouter.bufferToDataUrl(file.buffer, file.mimetype);
        params.frame_images = [{ type: 'image_url', image_url: { url: dataUrl }, frame_type: 'first_frame' }];
      } catch {
        throw new LocalizedError({ code: 'generic.referenceImage', status: 400 });
      }
    }

    const estimatedCredits = estimateCredits('video', { durationSeconds });

    // Idempotency: a client-supplied key short-circuits a duplicate submit (no re-charge,
    // no re-submit). If absent, mint a server-side key scoped to the user.
    const clientKey = req.headers.get('idempotency-key');
    idempotencyKey =
      clientKey && clientKey.trim() !== '' ? clientKey.trim() : `gen-vid:${userId}:${crypto.randomUUID()}`;

    // Resolve an existing generation by idempotency key. If it belongs to this user,
    // return its current serialized state without re-charging. If the key collides with
    // another user's generation (extremely unlikely), mint a fresh server key so the
    // unique constraint isn't violated.
    const existing = await prisma.generation.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.userId === userId) {
        const t = await getTranslations('errors');
        return json({
          id: existing.id,
          job_id: existing.jobId,
          polling_url: existing.pollingUrl,
          status: existing.status,
          message: t('generate.videoAlreadyAccepted', { id: existing.id }),
        });
      }
      idempotencyKey = `gen-vid:${userId}:${crypto.randomUUID()}`;
    }

    // Create the Generation row (status: pending). estimatedCredits is set now;
    // reservedCredits is filled after a successful reservation.
    const record = await prisma.generation.create({
      data: {
        userId,
        type: 'video',
        modelId,
        modelName: modelDef.displayName,
        prompt: fields.prompt,
        paramsJson: JSON.stringify(params),
        status: 'pending',
        provider: 'openrouter',
        idempotencyKey,
        estimatedCredits,
        projectId: projectId ?? undefined,
      },
      select: { id: true },
    });
    recordId = record.id;

    await appendRunEvent({ generationId: recordId, userId, type: 'created' });

    // Reserve credits before submitting to the provider. On insufficient balance, mark
    // the generation failed (Arabic), persist a failure RunEvent, and return 402 — no
    // refund is needed because nothing was reserved.
    try {
      await reserveCredits(userId, estimatedCredits, {
        generationId: recordId,
        idempotencyKey,
      });
      reservedCredits = estimatedCredits;
      await prisma.generation.update({
        where: { id: recordId },
        data: { reservedCredits },
      });
      await appendRunEvent({ generationId: recordId, userId, type: 'queued' });
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        await appendRunEvent({
          generationId: recordId,
          userId,
          type: 'failed',
          dataJson: JSON.stringify({ reason: 'insufficient_credits' }),
        });
        // Persisted `Generation.error` mirrors the worker's Arabic-in-DB pattern;
        // the HTTP response `error` field below is localized via the catalog.
        await prisma.generation
          .update({
            where: { id: recordId },
            data: { status: 'failed', error: 'الرصيد غير كافٍ لإتمام هذا التوليد' },
          })
          .catch(() => {});
        creditsReconciled = true; // nothing was reserved
        const t = await getTranslations('errors');
        return json(
          { id: recordId, error: t('credits.insufficient'), code: 'insufficient_credits' },
          402,
        );
      }
      throw e;
    }

    // Submit to the provider through the EXISTING path (signature/behavior unchanged).
    let jobId: string;
    let pollingUrl: string | null;
    try {
      const submit = await orouter.submitVideo(params);
      jobId = submit.id;
      pollingUrl = submit.polling_url ?? null;
    } catch (e) {
      const ne = normalizeError(e);
      await prisma.generation
        .update({ where: { id: recordId }, data: { status: 'failed', error: ne.messageAr } })
        .catch(() => {});
      await appendRunEvent({
        generationId: recordId,
        userId,
        type: 'failed',
        dataJson: JSON.stringify({ error: { code: ne.code, retryable: ne.retryable } }),
      });
      await refundCredits(userId, {
        generationId: recordId,
        amount: reservedCredits,
        idempotencyKey,
        reason: 'generation failed',
      });
      creditsReconciled = true;
      // Translate the provider error by its stable `code` via the request locale's
      // `errors.provider.*` catalog; fall back to `messageAr` for unmapped codes.
      const t = await getTranslations('errors');
      const providerKey = PROVIDER_CODE_TO_CATALOG_KEY[ne.code];
      const message = providerKey ? t(providerKey) : ne.messageAr;
      return json(
        { id: recordId, error: message, code: ne.code, retryable: ne.retryable },
        ne.retryable ? 502 : 400,
      );
    }

    await prisma.generation.update({
      where: { id: recordId },
      data: { status: 'pending', jobId, pollingUrl },
    });
    await appendRunEvent({
      generationId: recordId,
      userId,
      type: 'submitted',
      dataJson: JSON.stringify({ job_id: jobId }),
    });

    // Dispatch: use the durable BullMQ worker when Redis is available; otherwise fall
    // back to the in-process fire-and-forget poller (local dev without Redis). Both
    // write IDENTICAL RunEvents and settle/refund exactly once.
    if (process.env.REDIS_URL) {
      await enqueueVideoJob(recordId, jobId, t0, userId, reservedCredits, idempotencyKey);
    } else {
      pollAndDownloadVideo(recordId, jobId, t0, userId, reservedCredits, idempotencyKey).catch((e) => {
        console.warn('[video] in-process poll failed (set REDIS_URL for durable jobs):', (e as Error).message);
      });
    }

    const tSuccess = await getTranslations('errors');
    return json({
      id: recordId,
      job_id: jobId,
      polling_url: pollingUrl,
      status: 'pending',
      message: tSuccess('generate.videoAccepted', { id: recordId }),
    });
  } catch (e) {
    // Outer catch: handles failures that escaped the typed branches above. If we
    // reserved credits but never reconciled, refund exactly once (distinct recover key)
    // and persist a failure RunEvent.
    if (recordId != null && userId != null) {
      if (reservedCredits > 0 && !creditsReconciled) {
        await refundCredits(userId, {
          generationId: recordId,
          amount: reservedCredits,
          idempotencyKey: `recover:${recordId}`,
          reason: 'generation failed (uncaught)',
        }).catch(() => {});
      }
      await appendRunEvent({
        generationId: recordId,
        userId,
        type: 'failed',
        dataJson: JSON.stringify({ error: (e as Error)?.message ?? 'unknown' }),
      }).catch(() => {});
      // Persist a stable code (NOT the raw internal/stack message) to Generation.error
      // to avoid leaking SDK/provider internals on the read path.
      await prisma.generation
        .update({ where: { id: recordId }, data: { status: 'failed', error: 'generation_failed_uncaught' } })
        .catch(() => {});
      const t = await getTranslations('errors');
      return json({ id: recordId, error: t('generate.videoFailed') }, 502);
    }
    return handleError(e);
  }
}
