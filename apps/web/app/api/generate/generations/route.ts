// Ported from backend/src/routes/generate.js — GET /api/generate/generations
import { getDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const db = getDB();
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '') || 50, 200);
    const offset = parseInt(url.searchParams.get('offset') || '') || 0;
    const type = url.searchParams.get('type');

    let q =
      'SELECT id, type, model_id, model_name, prompt, status, asset_path, asset_media_type, cost, thumbnail_path, error, duration_ms, created_at, updated_at FROM generations WHERE user_id=?';
    const args: (string | number)[] = [userId];
    if (type) {
      q += ' AND type=?';
      args.push(type);
    }
    q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(limit, offset);

    const rows = db.prepare(q).all(...args) as Array<Record<string, any>>;
    const items = rows.map((r) => {
      const assets = String(r.asset_path || '')
        .split(',')
        .filter(Boolean)
        .map((fn) => `/api/assets/${fn}`);
      return { ...r, asset_urls: assets };
    });
    return json({ data: items, limit, offset });
  } catch (e) {
    return handleError(e);
  }
}
