// POST /api/generate/image
// Supports synchronous generation and SSE streaming (stream=true), plus an optional
// reference image (img2img) sent as multipart/form-data.
// Phase 4: generated images are stored in R2 (putObject); reference image is inlined
// as a base64 data URL — never written to disk.
import * as orouter from '@orms/openrouter';
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { parseRequest, json, handleError } from '@/lib/http';
import { putObject } from '@/lib/storage';
import { checkImageRateLimit } from '@/lib/ratelimit';

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

export async function POST(req: Request) {
  const t0 = Date.now();
  let recordId: number | null = null;
  try {
    const userId = requireAuth(req);
    const rl = await checkImageRateLimit(userId);
    if (!rl.allowed) {
      return Response.json(
        { error: 'تجاوزت حد الطلبات — حاول مرة أخرى قريباً', remaining: rl.remaining },
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
      return json({ error: 'النموذج والبرومبت مطلوبان' }, 400);
    }
    const wantStream = fields.stream === true || fields.stream === 'true';
    const params = buildParams(fields);

    // Optional reference image — inline as base64 data URL, no disk write.
    if (file) {
      try {
        const dataUrl = orouter.bufferToDataUrl(file.buffer, file.mimetype);
        params.input_references = [{ type: 'image_url', image_url: { url: dataUrl } }];
      } catch {
        return json({ error: 'فشل قراءة الصورة المرجعية' }, 400);
      }
    }

    const record = await prisma.generation.create({
      data: {
        userId,
        type: 'image',
        modelId: fields.model,
        modelName: fields.model,
        prompt: fields.prompt,
        paramsJson: JSON.stringify(params),
        status: 'pending',
      },
      select: { id: true },
    });
    recordId = record.id;

    if (wantStream) {
      return streamImage(recordId, params, t0);
    }

    // Non-streaming: generate, detect format, upload to R2.
    const result = await orouter.generateImage(params);
    const items = result.data || [];
    const saved: { filename: string; media_type: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.b64_json) continue;
      const buf = Buffer.from(it.b64_json, 'base64');
      // Detect format from magic bytes — Gemini sometimes returns JPEG under image/png.
      const isJpeg = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8;
      const isPng = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      let mediaType: string, ext: string;
      if (isJpeg) {
        mediaType = 'image/jpeg'; ext = '.jpg';
      } else if (isPng) {
        mediaType = 'image/png'; ext = '.png';
      } else if (it.media_type === 'image/webp') {
        mediaType = 'image/webp'; ext = '.webp';
      } else if (it.media_type === 'image/svg+xml') {
        mediaType = 'image/svg+xml'; ext = '.svg';
      } else {
        mediaType = it.media_type || 'image/png'; ext = '.png';
      }
      const fname = `img_${recordId}_${i}${ext}`;
      await putObject(fname, buf, mediaType);
      saved.push({ filename: fname, media_type: mediaType });
    }
    if (saved.length === 0) throw new Error('لم يُرجع الموديل أي صورة');
    const cost = result.usage?.cost ? String(result.usage.cost) : null;
    await prisma.generation.update({
      where: { id: recordId },
      data: {
        status: 'completed',
        assetPath: saved.map((s) => s.filename).join(','),
        assetMediaType: saved.map((s) => s.media_type).join(','),
        cost,
        durationMs: Date.now() - t0,
      },
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
    if (recordId != null) {
      await prisma.generation
        .update({ where: { id: recordId }, data: { status: 'failed', error: (e as Error).message } })
        .catch(() => {});
      return json({ id: recordId, error: 'فشل توليد الصورة', detail: (e as Error).message }, 502);
    }
    return handleError(e);
  }
}

// SSE streaming — proxies OpenRouter's image stream and persists the final image to R2.
function streamImage(recordId: number, params: Record<string, unknown>, t0: number): Response {
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        const upstream = await fetch(`${orouter.BASE}/images`, {
          method: 'POST',
          headers: orouter.headers(),
          body: JSON.stringify({ ...params, stream: true }),
        });
        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text();
          await prisma.generation.update({ where: { id: recordId }, data: { status: 'failed', error: t } }).catch(() => {});
          send({ type: 'error', error: { message: t } });
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
                send({ type: 'completed', id: recordId, filename: fname, cost });
              } else if (evt.type === 'error') {
                await prisma.generation
                  .update({ where: { id: recordId }, data: { status: 'failed', error: JSON.stringify(evt.error) } })
                  .catch(() => {});
                send({ type: 'error', error: evt.error });
              } else {
                send(evt);
              }
            } catch {
              /* ignore non-JSON */
            }
          }
        }
        controller.close();
      } catch (e) {
        await prisma.generation
          .update({ where: { id: recordId }, data: { status: 'failed', error: (e as Error).message } })
          .catch(() => {});
        try {
          send({ type: 'error', error: { message: (e as Error).message } });
        } catch {
          /* controller may be closed */
        }
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
