// Ported from backend/src/routes/generate.js — GET + DELETE /api/generate/generations/:id
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { serializeGeneration } from '@/lib/serialize';
import { ASSETS_DIR } from '@/lib/storage';

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
    for (const fn of String(row.assetPath || '').split(',')) {
      if (!fn) continue;
      const p = path.join(ASSETS_DIR, fn);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await prisma.generation.delete({ where: { id: row.id } });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
