// Background video poll + download — polls OpenRouter, then uploads the mp4 to R2.
// Still fire-and-forget in-process (Phase 5 moves this into a durable BullMQ worker).
import * as orouter from '@orms/openrouter';
import { prisma } from '@orms/db';
import { putObject } from './storage';

// Poll every 10s for up to ~15 minutes.
export async function pollAndDownloadVideo(recordId: number, jobId: string, t0: number): Promise<void> {
  const MAX_POLLS = 90; // 15 min @ 10s
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    let resp: orouter.VideoPollResult;
    try {
      resp = await orouter.pollVideo(jobId);
    } catch (e) {
      console.warn(`poll ${recordId}/${jobId} #${i}: ${(e as Error).message}`);
      continue;
    }
    const status = resp.status;
    await prisma.generation
      .update({ where: { id: recordId }, data: { status: status === 'in_progress' ? 'in_progress' : status } })
      .catch(() => {});
    if (status === 'completed') {
      const urls = resp.unsigned_urls || [];
      if (urls.length === 0) break;
      try {
        const buf = await orouter.downloadVideoContent(jobId, 0);
        const fname = `vid_${recordId}_0.mp4`;
        await putObject(fname, buf, 'video/mp4');
        const cost = resp.usage?.cost ? String(resp.usage.cost) : null;
        await prisma.generation.update({
          where: { id: recordId },
          data: { status: 'completed', assetPath: fname, assetMediaType: 'video/mp4', cost, durationMs: Date.now() - t0 },
        });
      } catch (e) {
        await prisma.generation
          .update({ where: { id: recordId }, data: { status: 'failed', error: 'download failed: ' + (e as Error).message } })
          .catch(() => {});
      }
      return;
    } else if (status === 'failed') {
      await prisma.generation
        .update({ where: { id: recordId }, data: { status: 'failed', error: resp.error || 'generation failed' } })
        .catch(() => {});
      return;
    }
  }
  await prisma.generation
    .update({ where: { id: recordId }, data: { status: 'failed', error: 'timeout waiting for video' } })
    .catch(() => {});
}
