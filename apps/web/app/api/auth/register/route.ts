// Ported from backend/src/routes/auth.js — POST /api/auth/register
import bcrypt from 'bcryptjs';
import { prisma } from '@orms/db';
import { sign } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import { serializeUser } from '@/lib/serialize';
import { grantSignupCredits } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password, name } = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      name?: string;
    };
    if (!email || !password) throw new LocalizedError({ code: 'auth.emailPasswordRequired', status: 400 });
    if (password.length < 6) throw new LocalizedError({ code: 'auth.passwordTooShort', status: 400 });

    const lower = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: lower }, select: { id: true } });
    if (existing) throw new LocalizedError({ code: 'auth.emailInUse', status: 409 });

    const hash = bcrypt.hashSync(password, 10);
    const user = await prisma.user.create({
      data: { email: lower, password: hash, name: name || null },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    // Grant the free signup credits (idempotent; never block registration on it).
    await grantSignupCredits(user.id).catch((e) => console.error('[credits] signup grant failed', e));
    return json({ token: sign(user.id), user: serializeUser(user) });
  } catch (e) {
    return handleError(e);
  }
}
