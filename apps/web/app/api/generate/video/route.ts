// Ported from backend/src/routes/generate.js — POST /api/generate/video
// Submits an async video job, responds immediately, then polls + downloads in the
// background (fire-and-forget; Phase 5 replaces this with a durable BullMQ worker).
import fs from 'node:fs';
import path from 'node:path';
import * as orouter from '@orms/openrouter';
import { getDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { parseRequest, json, handleError } from '@/lib/http';
import { UPLOADS_DIR, ensureStorageDirs } from '@/lib/storage';
import { pollAndDownloadVideo } from '@/lib/videoPoll';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const t0 = Date.now();
  let recordId: number | null = null;
  try {
    const userId = requireAuth(req);
    const { fields, file } = await parseRequest(req);
    if (!fields.model || !fields.prompt) return json({ error: 'النموذج والبرومبت مطلوبان' }, 400);

    const db = getDB();
    const params: Record<string, unknown> = { model: fields.model, prompt: fields.prompt };
    for (const k of ['duration', 'resolution', 'aspect_ratio', 'size']) {
      const v = fields[k];
      if (v !== undefined && v !== '') {
        if (k === 'duration') {
          const num = Number(v);
          if (!Number.isNaN(num)) params[k] = num; // skip non-numeric instead of forwarding NaN
        } else {
          params[k] = v;
        }
      }
    }

    // Optional first-frame image for image-to-video.
    if (file) {
      try {
        ensureStorageDirs();
        const ext = (path.extname(file.filename) || '.png').toLowerCase();
        const upName = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, upName), file.buffer);
        const dataUrl = orouter.bufferToDataUrl(file.buffer, file.mimetype);
        params.frame_images = [{ type: 'image_url', image_url: { url: dataUrl }, frame_type: 'first_frame' }];
      } catch {
        return json({ error: 'فشل قراءة الصورة المرجعية' }, 400);
      }
    }

    recordId = Number(
      db
        .prepare(
          `INSERT INTO generations (user_id, type, model_id, model_name, prompt, params_json, status)
           VALUES (?, 'video', ?, ?, ?, ?, 'pending')`,
        )
        .run(userId, fields.model, fields.model, fields.prompt, JSON.stringify(params)).lastInsertRowid,
    );

    const submit = await orouter.submitVideo(params);
    const jobId = submit.id;
    const pollingUrl = submit.polling_url ?? null;
    db.prepare(`UPDATE generations SET status='pending', job_id=?, polling_url=?, updated_at=datetime('now') WHERE id=?`).run(
      jobId,
      pollingUrl,
      recordId,
    );

    // Fire-and-forget background poll to auto-update.
    pollAndDownloadVideo(recordId, jobId, t0).catch((e) => {
      console.error('background poll failed:', (e as Error).message);
    });

    return json({
      id: recordId,
      job_id: jobId,
      polling_url: pollingUrl,
      status: 'pending',
      message: 'تم استلام طلب الفيديو — استخدم GET /api/generate/generations/' + recordId + ' للمتابعة',
    });
  } catch (e) {
    if (recordId != null) {
      try {
        getDB()
          .prepare(`UPDATE generations SET status='failed', error=?, updated_at=datetime('now') WHERE id=?`)
          .run((e as Error).message, recordId);
      } catch {
        /* ignore */
      }
      return json({ id: recordId, error: 'فشل إرسال طلب الفيديو', detail: (e as Error).message }, 502);
    }
    return handleError(e);
  }
}
