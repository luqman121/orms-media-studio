// Ported from backend/src/routes/auth.js — POST /api/auth/register
import bcrypt from 'bcryptjs';
import { getDB } from '@/lib/db';
import { sign } from '@/lib/auth';
import { json, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password, name } = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      name?: string;
    };
    if (!email || !password) return json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, 400);
    if (password.length < 6) return json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, 400);

    const db = getDB();
    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
    if (existing) return json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, 409);

    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)')
      .run(email.toLowerCase(), hash, name || null);
    const user = db
      .prepare('SELECT id, email, name, created_at FROM users WHERE id=?')
      .get(Number(info.lastInsertRowid)) as { id: number };
    return json({ token: sign(user.id), user });
  } catch (e) {
    return handleError(e);
  }
}
