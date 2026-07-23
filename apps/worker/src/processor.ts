// BullMQ job processor for the 'video-poll' queue.
// Polls OpenRouter every 10 s for up to 15 min; on completion, uploads the mp4 to R2,
// writes a normalized Asset row, settles credits exactly once, and marks the
// Postgres generation row as completed / failed.
//
// Phase 2b (Slice 2): this is the SOLE BullMQ consumer. It writes durable RunEvents
// (monotonic seq) and settles/refunds credits exactly once via @orms/generation-runtime.
// The in-process fallback (apps/web/lib/videoPoll.ts) MUST behave IDENTICALLY — same
// RunEvent types/seq-ordering, same credit idempotency keys. The reservation is
// AUTHORITATIVE from the web route (carried in job.data), so the worker never re-reads
// reservedCredits/idempotencyKey from the Generation row.
import type { Job } from 'bullmq';
import * as orouter from '@orms/openrouter';
import { prisma } from '@orms/db';
import { normalizeError, usdToCredits } from '@orms/model-router';
import { appendRunEvent, settleCredits, refundCredits } from '@orms/generation-runtime';
import { putObject } from './storage.js';

export interface VideoJobData {
  generationId: number;
  openrouterId: string;
  t0: number;
  // Carried from the web route's reservation so the worker can settle/refund without
  // re-reading the Generation row. These are AUTHORITATIVE for credit reconciliation.
  // MUST stay identical to apps/web/lib/queue.ts VideoJobData.
  userId: number;
  reservedCredits: number;
  idempotencyKey: string;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 90; // 15 min @ 10 s

export async function processVideoJob(job: Job<VideoJobData>): Promise<void> {
  const { generationId, openrouterId, t0, userId, reservedCredits, idempotencyKey } = job.data;

  for (let i = 0; i < MAX_POLLS; i++) {
    if (i > 0) {
      await job.updateProgress(Math.round((i / MAX_POLLS) * 100));
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    let resp: orouter.VideoPollResult;
    try {
      resp = await orouter.pollVideo(openrouterId);
    } catch (e) {
      console.warn(`[worker] poll gen=${generationId} or=${openrouterId} #${i}: ${(e as Error).message}`);
      continue;
    }

    const status = resp.status;
    await prisma.generation
      .update({ where: { id: generationId }, data: { status: status === 'in_progress' ? 'in_progress' : status } })
      .catch(() => {});

    // Emit a 'processing' RunEvent occasionally (first poll + every 10th) to avoid
    // event spam while still giving the SSE stream a heartbeat. At minimum one after
    // the first successful poll. NOT wrapped in .catch — let errors propagate to BullMQ.
    if (i === 0 || i % 10 === 0) {
      await appendRunEvent({
        generationId,
        userId,
        type: 'processing',
        dataJson: JSON.stringify({ poll: i, status }),
      });
    }

    if (status === 'completed') {
      const urls = resp.unsigned_urls ?? [];
      if (urls.length === 0) break;
      await appendRunEvent({ generationId, userId, type: 'downloading' });
      const buf = await orouter.downloadVideoContent(openrouterId, 0);
      await appendRunEvent({ generationId, userId, type: 'uploading' });
      const fname = `vid_${generationId}_0.mp4`;
      await putObject(fname, buf, 'video/mp4');
      const cost = resp.usage?.cost ? String(resp.usage.cost) : null;
      // Final cost in integer credits: prefer the provider-reported USD cost; fall back
      // to the pre-flight reservation when the provider reports none.
      const finalCredits = usdToCredits(resp.usage?.cost) || reservedCredits;
      // Normalized Asset row (kept alongside the legacy assetPath for back-compat).
      await prisma.asset.create({
        data: {
          userId,
          generationId,
          kind: 'video',
          storageKey: fname,
          mediaType: 'video/mp4',
          name: fname,
        },
      });
      await prisma.generation.update({
        where: { id: generationId },
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
        generationId,
        reservedCredits,
        finalCredits,
        idempotencyKey,
      });
      await appendRunEvent({
        generationId,
        userId,
        type: 'completed',
        dataJson: JSON.stringify({ assets: [{ filename: fname, media_type: 'video/mp4' }] }),
      });
      console.log(`[worker] gen=${generationId} completed → ${fname}`);
      return;
    }

    if (status === 'failed') {
      const ne = normalizeError(resp.error ?? 'generation failed');
      await prisma.generation
        .update({ where: { id: generationId }, data: { status: 'failed', error: ne.messageAr } })
        .catch(() => {});
      await appendRunEvent({
        generationId,
        userId,
        type: 'failed',
        dataJson: JSON.stringify({ error: { code: ne.code, retryable: ne.retryable } }),
      });
      // Refund exactly once (ledger `refund:{idempotencyKey}`). Never settle AND refund.
      await refundCredits(userId, {
        generationId,
        amount: reservedCredits,
        idempotencyKey,
        reason: 'generation failed',
      });
      console.warn(`[worker] gen=${generationId} failed`);
      return;
    }
  }

  // Timed out — treat as failure: refund once + failure RunEvent + Arabic error.
  await prisma.generation
    .update({
      where: { id: generationId },
      data: { status: 'failed', error: 'انتهت مهلة انتظار الفيديو' },
    })
    .catch(() => {});
  await appendRunEvent({
    generationId,
    userId,
    type: 'failed',
    dataJson: JSON.stringify({ reason: 'timeout' }),
  });
  await refundCredits(userId, {
    generationId,
    amount: reservedCredits,
    idempotencyKey,
    reason: 'generation timed out',
  });
  console.warn(`[worker] gen=${generationId} timed out after ${MAX_POLLS} polls`);
}