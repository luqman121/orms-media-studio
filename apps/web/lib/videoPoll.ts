// Background video poll + download — polls OpenRouter, then uploads the mp4 to R2.
// Fire-and-forget in-process fallback used when REDIS_URL is not set (local dev).
//
// Phase 2b (Slice 2): this MUST behave IDENTICALLY to apps/worker/src/processor.ts —
// same RunEvent types/seq-ordering, same credit idempotency keys, same settle-once /
// refund-once semantics. The ONLY differences are: it runs in-process (no
// job.updateProgress), uses apps/web/lib/storage putObject, and is fire-and-forget.
// Both import the shared credit + run-event logic from @orms/generation-runtime so
// there is exactly ONE credit architecture (no duplicate).
import * as orouter from '@orms/openrouter';
import { prisma } from '@orms/db';
import { normalizeError, usdToCredits } from '@orms/model-router';
import { appendRunEvent, settleCredits, refundCredits } from '@orms/generation-runtime';
import { putObject } from './storage';

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 90; // 15 min @ 10 s

// Poll every 10s for up to ~15 minutes. The reservation is AUTHORITATIVE from the web
// route (passed in), so this never re-reads reservedCredits/idempotencyKey from the
// Generation row. Writes identical RunEvents + credit reconciliation as the worker.
export async function pollAndDownloadVideo(
  recordId: number,
  jobId: string,
  t0: number,
  userId: number,
  reservedCredits: number,
  idempotencyKey: string,
): Promise<void> {
  for (let i = 0; i < MAX_POLLS; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    let resp: orouter.VideoPollResult;
    try {
      resp = await orouter.pollVideo(jobId);
    } catch (e) {
      console.warn(`[videoPoll] poll ${recordId}/${jobId} #${i}: ${(e as Error).message}`);
      continue;
    }

    const status = resp.status;
    await prisma.generation
      .update({ where: { id: recordId }, data: { status: status === 'in_progress' ? 'in_progress' : status } })
      .catch(() => {});

    // Emit a 'processing' RunEvent occasionally (first poll + every 10th) to avoid
    // event spam while still giving the SSE stream a heartbeat. At minimum one after
    // the first successful poll. NOT wrapped in .catch — let errors propagate.
    if (i === 0 || i % 10 === 0) {
      await appendRunEvent({
        generationId: recordId,
        userId,
        type: 'processing',
        dataJson: JSON.stringify({ poll: i, status }),
      });
    }

    if (status === 'completed') {
      const urls = resp.unsigned_urls || [];
      if (urls.length === 0) break;
      await appendRunEvent({ generationId: recordId, userId, type: 'downloading' });
      const buf = await orouter.downloadVideoContent(jobId, 0);
      await appendRunEvent({ generationId: recordId, userId, type: 'uploading' });
      const fname = `vid_${recordId}_0.mp4`;
      await putObject(fname, buf, 'video/mp4');
      const cost = resp.usage?.cost ? String(resp.usage.cost) : null;
      // Final cost in integer credits: prefer the provider-reported USD cost; fall back
      // to the pre-flight reservation when the provider reports none.
      const finalCredits = usdToCredits(resp.usage?.cost) || reservedCredits;
      // Normalized Asset row (kept alongside the legacy assetPath for back-compat).
      await prisma.asset.create({
        data: {
          userId,
          generationId: recordId,
          kind: 'video',
          storageKey: fname,
          mediaType: 'video/mp4',
          name: fname,
        },
      });
      await prisma.generation.update({
        where: { id: recordId },
        data: {
          status: 'completed',
          assetPath: fname,
          assetMediaType: 'video/mp4',
          cost,
          durationMs: Date.now() - t0,
          finalCredits,
        },
      });
      // Settle credits exactly once: reconcile the reservation against the real cost.
      // The gen idempotencyKey keys settle (ledger `settle:{key}`).
      await settleCredits(userId, {
        generationId: recordId,
        reservedCredits,
        finalCredits,
        idempotencyKey,
      });
      await appendRunEvent({
        generationId: recordId,
        userId,
        type: 'completed',
        dataJson: JSON.stringify({ assets: [{ filename: fname, media_type: 'video/mp4' }] }),
      });
      return;
    }

    if (status === 'failed') {
      const ne = normalizeError(resp.error ?? 'generation failed');
      await prisma.generation
        .update({ where: { id: recordId }, data: { status: 'failed', error: ne.messageAr } })
        .catch(() => {});
      await appendRunEvent({
        generationId: recordId,
        userId,
        type: 'failed',
        dataJson: JSON.stringify({ error: { code: ne.code, retryable: ne.retryable } }),
      });
      // Refund exactly once (ledger `refund:{idempotencyKey}`). Never settle AND refund.
      await refundCredits(userId, {
        generationId: recordId,
        amount: reservedCredits,
        idempotencyKey,
        reason: 'generation failed',
      });
      return;
    }
  }

  // Timed out — treat as failure: refund once + failure RunEvent + Arabic error.
  await prisma.generation
    .update({
      where: { id: recordId },
      data: { status: 'failed', error: 'انتهت مهلة انتظار الفيديو' },
    })
    .catch(() => {});
  await appendRunEvent({
    generationId: recordId,
    userId,
    type: 'failed',
    dataJson: JSON.stringify({ reason: 'timeout' }),
  });
  await refundCredits(userId, {
    generationId: recordId,
    amount: reservedCredits,
    idempotencyKey,
    reason: 'generation timed out',
  });
}