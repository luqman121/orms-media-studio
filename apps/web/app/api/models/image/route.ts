// Ported from backend/src/routes/models.js — GET /api/models/image
import { requireAuth, AuthError } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { listImageModels } from '@orms/openrouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    requireAuth(req);
    return json({ data: await listImageModels() });
  } catch (e) {
    if (e instanceof AuthError) return handleError(e);
    return json({ error: (e as Error).message }, 502);
  }
}
