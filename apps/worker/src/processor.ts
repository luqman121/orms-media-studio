// BullMQ job processor for the 'video-poll' queue.
// Polls OpenRouter every 10 s for up to 15 min; on completion, uploads the mp4 to R2
// and marks the Postgres generation row as completed / failed.
import type { Job } from 'bullmq';
import * as orouter from '@orms/openrouter';
import { prisma } from '@orms/db';
import { putObject } from './storage.js';

export interface VideoJobData {
  generationId: number;
  openrouterId: string;
  t0: number;
}

const POLL_INTERVAL_MS = 10_000;
const MAX_POLLS = 90; // 15 min @ 10 s

export async function processVideoJob(job: Job<VideoJobData>): Promise<void> {
  const { generationId, openrouterId, t0 } = job.data;

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

    if (status === 'completed') {
      const urls = resp.unsigned_urls ?? [];
      if (urls.length === 0) break;
      const buf = await orouter.downloadVideoContent(openrouterId, 0);
      const fname = `vid_${generationId}_0.mp4`;
      await putObject(fname, buf, 'video/mp4');
      const cost = resp.usage?.cost ? String(resp.usage.cost) : null;
      await prisma.generation.update({
        where: { id: generationId },
        data: { status: 'completed', assetPath: fname, assetMediaType: 'video/mp4', cost, durationMs: Date.now() - t0 },
      });
      console.log(`[worker] gen=${generationId} completed → ${fname}`);
      return;
    }

    if (status === 'failed') {
      await prisma.generation
        .update({ where: { id: generationId }, data: { status: 'failed', error: resp.error ?? 'generation failed' } })
        .catch(() => {});
      console.warn(`[worker] gen=${generationId} failed`);
      return;
    }
  }

  // Timed out
  await prisma.generation
    .update({ where: { id: generationId }, data: { status: 'failed', error: 'timeout waiting for video' } })
    .catch(() => {});
  console.warn(`[worker] gen=${generationId} timed out after ${MAX_POLLS} polls`);
}
