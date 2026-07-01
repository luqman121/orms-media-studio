// Ported from backend/src/routes/auth.js — POST /api/auth/register
import bcrypt from 'bcryptjs';
import { prisma } from '@orms/db';
import { sign } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { serializeUser } from '@/lib/serialize';

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

    const lower = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: lower }, select: { id: true } });
    if (existing) return json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, 409);

    const hash = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: { email: lower, password: hash, name: name || null },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return json({ token: sign(user.id), user: serializeUser(user) });
  } catch (e) {
    return handleError(e);
  }
}
