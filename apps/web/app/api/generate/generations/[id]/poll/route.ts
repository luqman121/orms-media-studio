// POST /api/generate/generations/:id/poll
// Force-updates a video job's status from OpenRouter (client-triggered check).
// Phase 4: completed video is uploaded to R2 via putObject.
import * as orouter from '@orms/openrouter';
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import { putObject } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    // Positive-integer guard (mirrors /generations/[id] GET+DELETE) so a non-numeric
    // `id` resolves to a clean 404 instead of a 500 from Prisma.
    const generationId = Number(id);
    if (!Number.isInteger(generationId) || generationId <= 0) {
      throw new LocalizedError({ code: 'generic.notFound', status: 404 });
    }
    const row = await prisma.generation.findFirst({ where: { id: generationId, userId } });
    if (!row) throw new LocalizedError({ code: 'generic.notFound', status: 404 });
    if (row.type !== 'video' || !row.jobId) throw new LocalizedError({ code: 'generate.notVideoJob', status: 400 });
    if (row.status === 'completed' || row.status === 'failed') return json({ status: row.status, id: row.id });

    try {
      const resp = await orouter.pollVideo(row.jobId);
      const status = resp.status;
      if (status === 'completed') {
        const urls = resp.unsigned_urls || [];
        if (urls.length > 0) {
          const buf = await orouter.downloadVideoContent(row.jobId, 0);
          const fname = `vid_${row.id}_0.mp4`;
          await putObject(fname, buf, 'video/mp4');
          const cost = resp.usage?.cost ? String(resp.usage.cost) : null;
          await prisma.generation.update({
            where: { id: row.id },
            data: { status: 'completed', assetPath: fname, assetMediaType: 'video/mp4', cost },
          });
          return json({ id: row.id, status: 'completed' });
        }
      }
      await prisma.generation.update({
        where: { id: row.id },
        data: { status: status === 'in_progress' ? 'in_progress' : status },
      });
      return json({ id: row.id, status });
    } catch (e) {
      // Provider poll/download failure — log server-side only; return a non-leaking
      // localized generic so raw provider/SDK detail never reaches the client.
      console.error('[poll] provider failure', (e as Error)?.message);
      throw new LocalizedError({ code: 'generic.serverError', status: 502 });
    }
  } catch (e) {
    return handleError(e);
  }
}
