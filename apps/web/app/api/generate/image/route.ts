// POST /api/generate/image
// Supports synchronous generation and SSE streaming (stream=true), plus an optional
// reference image (img2img) sent as multipart/form-data.
// Phase 4: generated images are stored in R2 (putObject); reference image is inlined
// as a base64 data URL — never written to disk.
//
// Phase 2b (Slice 1): the NON-STREAM path is wired to the durable, server-authoritative
// lifecycle — server-side capability validation, server-side credit estimate, idempotent
// Generation creation, durable RunEvents with monotonic seq, exactly-once reserve/settle
// (or refund on failure), and normalized Asset rows (alongside the legacy assetPath).
// The SSE stream path is intentionally untouched in this slice (a later slice replaces
// its in-memory events with RunEvent-sourced durable SSE).
import * as orouter from '@orms/openrouter';
import { prisma } from '@orms/db';
import { estimateCredits, findModelDefinition, normalizeError, usdToCredits } from '@orms/model-router';
import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth';
import { parseRequest, json, handleError, PROVIDER_CODE_TO_CATALOG_KEY } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import { putObject } from '@/lib/storage';
import { checkImageRateLimit } from '@/lib/ratelimit';
import { reserveCredits, settleCredits, refundCredits, InsufficientCreditsError } from '@/lib/credits';
import { appendRunEvent } from '@/lib/run-events';
import { serializeGeneration } from '@/lib/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildParams(fields: Record<string, any>): Record<string, unknown> {
  const params: Record<string, unknown> = { model: fields.model, prompt: fields.prompt };
  for (const k of ['n', 'resolution', 'aspect_ratio', 'quality', 'output_format', 'background', 'seed']) {
    const v = fields[k];
    if (v !== undefined && v !== '') {
      if (k === 'n' || k === 'seed') {
        const num = Number(v);
        if (!Number.isNaN(num)) params[k] = num;
      } else {
        params[k] = v;
      }
    }
  }
  return params;
}

// Detect an image's media type from magic bytes (Gemini sometimes returns JPEG under
// image/png), falling back to the provider-declared media_type. Returns the media type
// and a matching file extension.
function detectImageFormat(buf: Buffer, declared?: string): { mediaType: string; ext: string } {
  const isJpeg = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (isJpeg) return { mediaType: 'image/jpeg', ext: '.jpg' };
  if (isPng) return { mediaType: 'image/png', ext: '.png' };
  if (declared === 'image/webp') return { mediaType: 'image/webp', ext: '.webp' };
  if (declared === 'image/svg+xml') return { mediaType: 'image/svg+xml', ext: '.svg' };
  return { mediaType: declared || 'image/png', ext: '.png' };
}

export async function POST(req: Request) {
  const t0 = Date.now();
  let userId: number | null = null;
  let recordId: number | null = null;
  // Credit reconciliation guard for the outer catch: once we reserve credits we MUST
  // either settle or refund exactly once before returning. These track that obligation.
  let reservedCredits = 0;
  let creditsReconciled = false;
  try {
    userId = requireAuth(req);
    const rl = await checkImageRateLimit(userId);
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
    if (!fields.model || !fields.prompt) {
      throw new LocalizedError({ code: 'generate.modelRequired', status: 400 });
    }
    const wantStream = fields.stream === true || fields.stream === 'true';
    const params = buildParams(fields);

    // Optional reference image — inline as base64 data URL, no disk write.
    if (file) {
      try {
        const dataUrl = orouter.bufferToDataUrl(file.buffer, file.mimetype);
        params.input_references = [{ type: 'image_url', image_url: { url: dataUrl } }];
      } catch {
        throw new LocalizedError({ code: 'generic.referenceImage', status: 400 });
      }
    }

    // ---- Shared durable preamble: capability + ownership + estimate + reserve ----
    // Both the SSE stream path and the non-stream path run through this so the credit
    // lifecycle (reserve → submit → settle/refund exactly once) is enforced uniformly.
    // Previously the `stream=true` path bypassed reservation entirely (free generation
    // vector); this preamble closes that gap (orms-security audit finding HIGH #1).

    // Ownership validation: if a projectId is referenced, it must belong to this user.
    // (projectId is reserved for Phase 4 Projects; validated defensively today.)
    const projectIdRaw = fields.projectId;
    const projectId =
      projectIdRaw != null && projectIdRaw !== '' && Number.isFinite(Number(projectIdRaw))
        ? Number(projectIdRaw)
        : null;
    if (projectId != null) {
      const proj = await prisma.project.findFirst({ where: { id: projectId, userId } });
      if (!proj) {
        throw new LocalizedError({ code: 'generate.projectNotOwned', status: 403 });
      }
    }

    // Server-side capability validation via @orms/model-router (never trust the client).
    const modelDef = await findModelDefinition(fields.model);
    if (!modelDef || modelDef.mediaType !== 'image') {
      throw new LocalizedError({ code: 'generate.modelNotImage', status: 400 });
    }

    // Server-side credit estimate (integer units). `n` defaults to 1.
    const count = typeof params.n === 'number' && params.n > 0 ? Math.floor(params.n) : 1;
    const estimatedCredits = estimateCredits('image', { count });

    // Idempotency: a client-supplied key short-circuits a duplicate submit (no re-charge,
    // no re-submit). If absent, mint a server-side key scoped to the user.
    const clientKey = req.headers.get('idempotency-key');
    let idempotencyKey =
      clientKey && clientKey.trim() !== '' ? clientKey.trim() : `gen-img:${userId}:${crypto.randomUUID()}`;

    // Resolve an existing generation by idempotency key. If it belongs to this user,
    // return its current serialized state without re-charging. If the key collides with
    // another user's generation (extremely unlikely), mint a fresh server key so the
    // unique constraint isn't violated.
    const existing = await prisma.generation.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.userId === userId) {
        return json(serializeGeneration(existing), 200);
      }
      idempotencyKey = `gen-img:${userId}:${crypto.randomUUID()}`;
    }

    // Create the Generation row (status: pending). estimatedCredits is set now;
    // reservedCredits is filled after a successful reservation.
    const record = await prisma.generation.create({
      data: {
        userId,
        type: 'image',
        modelId: fields.model,
        modelName: fields.model,
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
        // The persisted `Generation.error` mirrors the worker's Arabic-in-DB pattern
        // (the worker writes `ne.messageAr` for provider failures); localizing the
        // read path would require a schema error-code column + worker changes, which
        // are out of scope for this strings-only slice. The HTTP response `error`
        // field below IS localized via the catalog.
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

    // ---- Branch: SSE stream path vs non-stream synchronous path ----
    if (wantStream) {
      // Hand the reconcile context to streamImage so it can settle on the upstream
      // `completed` frame and refund on `error`/upstream-failure — exactly once, keyed
      // by the same `idempotencyKey` the reservation used.
      return streamImage(recordId, params, t0, userId, reservedCredits, idempotencyKey);
    }

    // ---- Non-stream path: synchronous provider submit → settle/refund ----

    // Submit to the provider through the EXISTING path (signature/behavior unchanged).
    let result;
    try {
      result = await orouter.generateImage(params);
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

    // Process the result: upload each image to R2 and collect both the legacy
    // assetPath entries and normalized Asset rows.
    const items = result.data || [];
    const saved: { filename: string; media_type: string }[] = [];
    const assetRows: {
      userId: number;
      generationId: number;
      kind: string;
      storageKey: string;
      mediaType: string;
      name: string;
    }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.b64_json) continue;
      const buf = Buffer.from(it.b64_json, 'base64');
      const { mediaType, ext } = detectImageFormat(buf, it.media_type);
      const fname = `img_${recordId}_${i}${ext}`;
      await putObject(fname, buf, mediaType);
      saved.push({ filename: fname, media_type: mediaType });
      assetRows.push({
        userId,
        generationId: recordId,
        kind: 'image',
        storageKey: fname,
        mediaType,
        name: fname,
      });
    }
    if (saved.length === 0) throw new Error('model returned no images');

    // Persist normalized Asset rows (kept alongside the legacy assetPath for back-compat).
    if (assetRows.length > 0) {
      await prisma.asset.createMany({ data: assetRows });
    }

    const cost = result.usage?.cost ? String(result.usage.cost) : null;
    // Final cost in integer credits: prefer the provider-reported USD cost; fall back to
    // the pre-flight estimate when the provider reports none.
    const finalCredits = usdToCredits(result.usage?.cost) || estimatedCredits;

    await prisma.generation.update({
      where: { id: recordId },
      data: {
        status: 'completed',
        assetPath: saved.map((s) => s.filename).join(','),
        assetMediaType: saved.map((s) => s.media_type).join(','),
        cost,
        durationMs: Date.now() - t0,
        finalCredits,
      },
    });

    // Settle credits exactly once: reconcile the reservation against the real cost.
    await settleCredits(userId, {
      generationId: recordId,
      reservedCredits,
      finalCredits,
      idempotencyKey,
    });
    creditsReconciled = true;

    await appendRunEvent({
      generationId: recordId,
      userId,
      type: 'completed',
      dataJson: JSON.stringify({ assets: saved }),
    });

    return json({
      id: recordId,
      status: 'completed',
      duration_ms: Date.now() - t0,
      cost,
      assets: saved,
      usage: result.usage,
    });
  } catch (e) {
    // Outer catch: handles failures that escaped the typed branches above (e.g. R2
    // upload, asset write, or settle — non-stream path only; the stream path reconciles
    // inside its own closures). If we reserved credits but never reconciled, refund
    // exactly once and persist a failure RunEvent. Never leak raw internal/stack text.
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
        dataJson: JSON.stringify({ reason: 'uncaught' }),
      }).catch(() => {});
      // Persist a stable code (NOT the raw internal/stack message) to Generation.error
      // to avoid leaking SDK/provider internals on the read path.
      await prisma.generation
        .update({ where: { id: recordId }, data: { status: 'failed', error: 'generation_failed_uncaught' } })
        .catch(() => {});
      const t = await getTranslations('errors');
      return json({ id: recordId, error: t('generate.imageFailed') }, 502);
    }
    return handleError(e);
  }
}

// SSE streaming — proxies OpenRouter's image stream, persists the final image to R2,
// and reconciles credits (settle on completed, refund on error/upstream-failure) so the
// stream path can no longer generate media without paying for it. Settlement/refund are
// keyed by the same `idempotencyKey` the reservation used; the unique constraint on
// `CreditLedger.idempotencyKey` makes them exactly-once even if a frame repeats.
function streamImage(
  recordId: number,
  params: Record<string, unknown>,
  t0: number,
  userId: number,
  reservedCredits: number,
  idempotencyKey: string,
): Response {
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      // Reconcile flag lives in this stream closure. The idempotency-key constraint
      // also guards duplicates, but the flag avoids redundant provider error writes.
      let reconciled = false;
      // Refund once on any failure path (upstream !ok, error frame, exception). The
      // idempotency key (`refund:{idempotencyKey}`) makes it safe to call repeatedly.
      const refundOnce = async (reason: string) => {
        if (reconciled) return;
        await refundCredits(userId, {
          generationId: recordId,
          amount: reservedCredits,
          idempotencyKey,
          reason,
        }).catch(() => {});
        reconciled = true;
      };
      // Persist failure then send a non-leaking error frame. The provider error is
      // logged server-side only; the streamed `message` is the stable code, not the
      // raw provider/SDK text.
      const failStream = async (reason: string) => {
        await prisma.generation
          .update({ where: { id: recordId }, data: { status: 'failed', error: reason } })
          .catch(() => {});
        await appendRunEvent({
          generationId: recordId,
          userId,
          type: 'failed',
          dataJson: JSON.stringify({ reason }),
        }).catch(() => {});
        await refundOnce(reason);
        try {
          send({ type: 'error', error: { code: 'generation_failed' } });
        } catch {
          /* controller may be closed */
        }
      };

      try {
        const upstream = await fetch(`${orouter.BASE}/images`, {
          method: 'POST',
          headers: orouter.headers(),
          body: JSON.stringify({ ...params, stream: true }),
        });
        if (!upstream.ok || !upstream.body) {
          // Upstream rejected the request before streaming — log server-side, refund,
          // persist a stable failure code (NOT the raw upstream body, which may contain
          // provider-internal detail).
          console.error('[stream-image] upstream non-ok', upstream.status);
          await failStream('upstream_rejected');
          controller.close();
          return;
        }
        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line || !line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              send({ type: 'done' });
              continue;
            }
            try {
              const evt = JSON.parse(payload);
              if (evt.type === 'image_generation.partial_image') {
                send({ type: 'partial', index: evt.partial_image_index, b64: evt.b64_json });
              } else if (evt.type === 'image_generation.completed') {
                const mediaType = evt.media_type || 'image/png';
                const ext =
                  mediaType === 'image/jpeg' ? '.jpg' : mediaType === 'image/webp' ? '.webp' : mediaType === 'image/svg+xml' ? '.svg' : '.png';
                const fname = `img_${recordId}_0${ext}`;
                await putObject(fname, Buffer.from(evt.b64_json, 'base64'), mediaType);
                const cost = evt.usage?.cost ? String(evt.usage.cost) : null;
                await prisma.generation.update({
                  where: { id: recordId },
                  data: { status: 'completed', assetPath: fname, assetMediaType: mediaType, cost, durationMs: Date.now() - t0 },
                });
                // Normalize to an Asset row (consistent with the non-stream path).
                await prisma.asset.create({
                  data: {
                    userId,
                    generationId: recordId,
                    kind: 'image',
                    storageKey: fname,
                    mediaType,
                    name: fname,
                  },
                }).catch(() => {});
                // Settle exactly once keyed by idempotencyKey. If final cost is
                // available, reconcile against it; else treat the reservation as the
                // real cost (no refund, no extra charge).
                const finalCredits = usdToCredits(evt.usage?.cost) || reservedCredits;
                await settleCredits(userId, {
                  generationId: recordId,
                  reservedCredits,
                  finalCredits,
                  idempotencyKey,
                }).catch(() => {});
                reconciled = true;
                await appendRunEvent({
                  generationId: recordId,
                  userId,
                  type: 'completed',
                  dataJson: JSON.stringify({ assets: [{ filename: fname, media_type: mediaType }] }),
                }).catch(() => {});
                send({ type: 'completed', id: recordId, filename: fname, cost });
              } else if (evt.type === 'error') {
                // Provider-reported error frame — log server-side, refund, persist
                // stable code (NOT the raw evt.error JSON, which may contain internals).
                console.error('[stream-image] provider error frame', JSON.stringify(evt.error));
                await failStream('provider_error');
              } else {
                send(evt);
              }
            } catch {
              /* ignore non-JSON */
            }
          }
        }
        // Stream ended without a `completed` frame and without an `error` frame.
        // If we never reconciled, this is an aborted/empty run: refund once so credits
        // are not silently reserved forever.
        if (!reconciled) {
          await failStream('stream_ended_without_terminal');
        }
        controller.close();
      } catch (e) {
        console.error('[stream-image] exception', (e as Error)?.message);
        await failStream('stream_exception');
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
