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

export async function GET(req: Request, ctx: Ctx) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const generationId = Number(id);
    if (!Number.isInteger(generationId) || generationId <= 0) throw new LocalizedError({ code: 'generic.notFound', status: 404 });
    const row = await prisma.generation.findFirst({ where: { id: generationId, userId } });
    if (!row) throw new LocalizedError({ code: 'generic.notFound', status: 404 });
    return json(await serializeGenerationWithSignedUrls(row));
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
