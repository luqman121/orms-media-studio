// Ported from backend/src/routes/auth.js — POST /api/auth/login
import bcrypt from 'bcryptjs';
import { prisma } from '@orms/db';
import { sign } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import { serializeUser } from '@/lib/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
    if (!email || !password) throw new LocalizedError({ code: 'auth.emailPasswordRequired', status: 400 });

    const row = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!row) throw new LocalizedError({ code: 'auth.invalidCredentials', status: 401 });
    if (!bcrypt.compareSync(password, row.password)) throw new LocalizedError({ code: 'auth.invalidCredentials', status: 401 });

    return json({ token: sign(row.id), user: serializeUser(row) });
  } catch (e) {
    return handleError(e);
  }
}
