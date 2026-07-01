// Ported from backend/src/routes/generate.js — POST /api/generate/generations/:id/poll
// Force-updates a video job's status from OpenRouter (used by the client poller).
import fs from 'node:fs';
import path from 'node:path';
import * as orouter from '@orms/openrouter';
import { getDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { ASSETS_DIR, ensureStorageDirs } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const db = getDB();
    const row = db.prepare('SELECT * FROM generations WHERE id=? AND user_id=?').get(Number(id), userId) as
      | Record<string, any>
      | undefined;
    if (!row) return json({ error: 'غير موجود' }, 404);
    if (row.type !== 'video' || !row.job_id) return json({ error: 'ليس طلب فيديو صالح' }, 400);
    if (row.status === 'completed' || row.status === 'failed') return json({ status: row.status, id: row.id });

    try {
      const resp = await orouter.pollVideo(row.job_id);
      const status = resp.status;
      if (status === 'completed') {
        const urls = resp.unsigned_urls || [];
        if (urls.length > 0) {
          const buf = await orouter.downloadVideoContent(row.job_id, 0);
          ensureStorageDirs();
          const fname = `vid_${row.id}_0.mp4`;
          fs.writeFileSync(path.join(ASSETS_DIR, fname), buf);
          const cost = resp.usage?.cost ? String(resp.usage.cost) : null;
          db.prepare(
            `UPDATE generations SET status='completed', asset_path=?, asset_media_type='video/mp4', cost=?, updated_at=datetime('now') WHERE id=?`,
          ).run(fname, cost, row.id);
          return json({ id: row.id, status: 'completed' });
        }
      }
      db.prepare(`UPDATE generations SET status=?, updated_at=datetime('now') WHERE id=?`).run(
        status === 'in_progress' ? 'in_progress' : status,
        row.id,
      );
      return json({ id: row.id, status });
    } catch (e) {
      return json({ error: (e as Error).message }, 502);
    }
  } catch (e) {
    return handleError(e);
  }
}
