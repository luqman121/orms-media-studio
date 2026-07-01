// Ported from backend/src/routes/generate.js — GET + DELETE /api/generate/generations/:id
import fs from 'node:fs';
import path from 'node:path';
import { getDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { ASSETS_DIR } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const db = getDB();
    const row = db.prepare('SELECT * FROM generations WHERE id=? AND user_id=?').get(Number(id), userId) as
      | Record<string, any>
      | undefined;
    if (!row) return json({ error: 'غير موجود' }, 404);
    const assets = String(row.asset_path || '')
      .split(',')
      .filter(Boolean)
      .map((fn) => `/api/assets/${fn}`);
    return json({ ...row, asset_urls: assets });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const userId = requireAuth(req);
    const { id } = await ctx.params;
    const db = getDB();
    const row = db.prepare('SELECT * FROM generations WHERE id=? AND user_id=?').get(Number(id), userId) as
      | Record<string, any>
      | undefined;
    if (!row) return json({ error: 'غير موجود' }, 404);
    for (const fn of String(row.asset_path || '').split(',')) {
      if (!fn) continue;
      const p = path.join(ASSETS_DIR, fn);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    db.prepare('DELETE FROM generations WHERE id=?').run(row.id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
