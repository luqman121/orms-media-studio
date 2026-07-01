// Ported from backend/src/routes/auth.js — POST /api/auth/login
import bcrypt from 'bcryptjs';
import { getDB } from '@/lib/db';
import { sign } from '@/lib/auth';
import { json, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
    if (!email || !password) return json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, 400);

    const db = getDB();
    const row = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) as
      | { id: number; password: string }
      | undefined;
    if (!row) return json({ error: 'بيانات الدخول غير صحيحة' }, 401);
    if (!bcrypt.compareSync(password, row.password)) return json({ error: 'بيانات الدخول غير صحيحة' }, 401);

    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id=?').get(row.id);
    return json({ token: sign(row.id), user });
  } catch (e) {
    return handleError(e);
  }
}
