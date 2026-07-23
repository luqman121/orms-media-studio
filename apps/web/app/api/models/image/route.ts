// Ported from backend/src/routes/models.js — GET /api/models/image
import { requireAuth, AuthError } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { listImageModelDefinitions, normalizeError } from '@orms/model-router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    requireAuth(req);
    const definitions = await listImageModelDefinitions();
    return json({ data: definitions.filter((model) => model.enabled) });
  } catch (e) {
    if (e instanceof AuthError) return handleError(e);
    return handleError(normalizeError(e));
  }
}
