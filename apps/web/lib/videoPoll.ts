// Background video poll + download — ported from pollAndDownloadVideo() in
// backend/src/routes/generate.js. Still fire-and-forget in-process (a known
// reliability risk); Phase 5 moves this into a durable BullMQ worker.
import fs from 'node:fs';
import path from 'node:path';
import * as orouter from '@orms/openrouter';
import { getDB } from './db';
import { ASSETS_DIR, ensureStorageDirs } from './storage';

// Poll every 10s for up to ~15 minutes, then download the file.
export async function pollAndDownloadVideo(recordId: number, jobId: string, t0: number): Promise<void> {
  const db = getDB();
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
    db.prepare(`UPDATE generations SET status=?, updated_at=datetime('now') WHERE id=?`).run(
      status === 'in_progress' ? 'in_progress' : status,
      recordId,
    );
    if (status === 'completed') {
      const urls = resp.unsigned_urls || [];
      if (urls.length === 0) break;
      try {
        const buf = await orouter.downloadVideoContent(jobId, 0);
        ensureStorageDirs();
        const fname = `vid_${recordId}_0.mp4`;
        fs.writeFileSync(path.join(ASSETS_DIR, fname), buf);
        const cost = resp.usage?.cost ? String(resp.usage.cost) : null;
        db.prepare(
          `UPDATE generations SET status='completed', asset_path=?, asset_media_type='video/mp4', cost=?, duration_ms=?, updated_at=datetime('now') WHERE id=?`,
        ).run(fname, cost, Date.now() - t0, recordId);
      } catch (e) {
        db.prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(
          'download failed: ' + (e as Error).message,
          recordId,
        );
      }
      return;
    } else if (status === 'failed') {
      db.prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`).run(
        resp.error || 'generation failed',
        recordId,
      );
      return;
    }
  }
  db.prepare(`UPDATE generations SET status='failed', error='timeout waiting for video', updated_at=datetime('now') WHERE id=?`).run(
    recordId,
  );
}
