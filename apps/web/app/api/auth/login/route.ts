// Ported from backend/src/routes/auth.js — POST /api/auth/login
import bcrypt from 'bcryptjs';
import { prisma } from '@orms/db';
import { sign } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { serializeUser } from '@/lib/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
    if (!email || !password) return json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' }, 400);

    const row = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!row) return json({ error: 'بيانات الدخول غير صحيحة' }, 401);
    if (!bcrypt.compareSync(password, row.password)) return json({ error: 'بيانات الدخول غير صحيحة' }, 401);

    return json({ token: sign(row.id), user: serializeUser(row) });
  } catch (e) {
    return handleError(e);
  }
}
