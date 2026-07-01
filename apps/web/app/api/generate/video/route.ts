// POST /api/generate/video
// Submits an async video job, responds immediately, then polls + downloads in the
// background (fire-and-forget; Phase 5 replaces this with a durable BullMQ worker).
// Phase 4: reference image is inlined as base64 — no disk write needed.
import * as orouter from '@orms/openrouter';
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { parseRequest, json, handleError } from '@/lib/http';
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

    const params: Record<string, unknown> = { model: fields.model, prompt: fields.prompt };
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

    // Optional first-frame image for image-to-video — inline as base64, no disk write.
    if (file) {
      try {
        const dataUrl = orouter.bufferToDataUrl(file.buffer, file.mimetype);
        params.frame_images = [{ type: 'image_url', image_url: { url: dataUrl }, frame_type: 'first_frame' }];
      } catch {
        return json({ error: 'فشل قراءة الصورة المرجعية' }, 400);
      }
    }

    const record = await prisma.generation.create({
      data: {
        userId,
        type: 'video',
        modelId: fields.model,
        modelName: fields.model,
        prompt: fields.prompt,
        paramsJson: JSON.stringify(params),
        status: 'pending',
      },
      select: { id: true },
    });
    recordId = record.id;

    const submit = await orouter.submitVideo(params);
    const jobId = submit.id;
    const pollingUrl = submit.polling_url ?? null;
    await prisma.generation.update({
      where: { id: recordId },
      data: { status: 'pending', jobId, pollingUrl },
    });

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
      await prisma.generation
        .update({ where: { id: recordId }, data: { status: 'failed', error: (e as Error).message } })
        .catch(() => {});
      return json({ id: recordId, error: 'فشل إرسال طلب الفيديو', detail: (e as Error).message }, 502);
    }
    return handleError(e);
  }
}
