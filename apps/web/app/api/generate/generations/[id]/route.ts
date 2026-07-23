// GET + DELETE /api/generate/generations/:id
// Phase 4: DELETE removes asset objects from R2 (fire-and-forget; non-fatal if R2 fails).
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import { serializeGenerationWithSignedUrls } from '@/lib/serialize';
import { deleteObject } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

function retryableFromFailedEvent(status: string, dataJson: string | null | undefined): boolean {
  if (status !== 'failed' || !dataJson) return false;
  try {
    const data = JSON.parse(dataJson) as {
      retryable?: unknown;
      error?: { retryable?: unknown };
    };
    return data.retryable === true || data.error?.retryable === true;
  } catch {
    return false;
  }
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const generationId = Number(id);
    if (!Number.isInteger(generationId) || generationId <= 0) throw new LocalizedError({ code: 'generic.notFound', status: 404 });
    const row = await prisma.generation.findFirst({ where: { id: generationId, userId } });
    if (!row) throw new LocalizedError({ code: 'generic.notFound', status: 404 });
    const latestFailedEvent =
      row.status === 'failed'
        ? await prisma.runEvent.findFirst({
            where: { generationId: row.id, userId, type: 'failed' },
            orderBy: { seq: 'desc' },
            select: { dataJson: true },
          })
        : null;
    return json(
      await serializeGenerationWithSignedUrls(row, {
        retryable: retryableFromFailedEvent(row.status, latestFailedEvent?.dataJson),
      }),
    );
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const generationId = Number(id);
    if (!Number.isInteger(generationId) || generationId <= 0) throw new LocalizedError({ code: 'generic.notFound', status: 404 });
    const row = await prisma.generation.findFirst({ where: { id: generationId, userId } });
    if (!row) throw new LocalizedError({ code: 'generic.notFound', status: 404 });
    // Delete R2 objects; non-fatal if already gone.
    await Promise.allSettled(
      String(row.assetPath || '')
        .split(',')
        .filter(Boolean)
        .map((key) => deleteObject(key)),
    );
    await prisma.generation.delete({ where: { id: row.id } });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
