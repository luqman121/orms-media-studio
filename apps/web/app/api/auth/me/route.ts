// Ported from backend/src/routes/auth.js — GET /api/auth/me
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import { serializeUser } from '@/lib/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) throw new LocalizedError({ code: 'auth.userNotFound', status: 404 });
    return json({ user: serializeUser(user) });
  } catch (e) {
    return handleError(e);
  }
}
