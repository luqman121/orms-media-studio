// GET + DELETE /api/generate/generations/:id
// Phase 4: DELETE removes asset objects from R2 (fire-and-forget; non-fatal if R2 fails).
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { serializeGeneration } from '@/lib/serialize';
import { deleteObject } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const row = await prisma.generation.findFirst({ where: { id: Number(id), userId } });
    if (!row) return json({ error: 'غير موجود' }, 404);
    return json(serializeGeneration(row));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const row = await prisma.generation.findFirst({ where: { id: Number(id), userId } });
    if (!row) return json({ error: 'غير موجود' }, 404);
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
