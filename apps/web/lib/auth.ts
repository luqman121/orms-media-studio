// JWT auth — ported from backend/src/middleware/auth.js.
// Phase (scalable target) upgrades this to jose + short access token + refresh
// token, and removes the dev-secret fallback.
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EXPIRY = '30d';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[auth] WARNING: JWT_SECRET is not set — using an insecure default. Set it before deploying.');
}

export function sign(userId: number): string {
  return jwt.sign({ uid: userId }, SECRET, { expiresIn: EXPIRY });
}

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Extract + verify the Bearer token, returning the user id. Throws AuthError on failure.
export function requireAuth(req: Request): number {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) throw new AuthError('التوثيق مطلوب');
  try {
    const payload = jwt.verify(m[1], SECRET) as { uid: number };
    return payload.uid;
  } catch {
    throw new AuthError('رمز غير صالح');
  }
}
