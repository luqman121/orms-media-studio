// Ported from backend/src/routes/auth.js — GET /api/auth/me
import { getDB } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const db = getDB();
    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id=?').get(userId);
    if (!user) return json({ error: 'المستخدم غير موجود' }, 404);
    return json({ user });
  } catch (e) {
    return handleError(e);
  }
}
