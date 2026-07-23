// Ported from backend/src/routes/models.js — GET /api/models?type=image|video
import { requireAuth, AuthError } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import {
  listModelDefinitions,
  normalizeError,
  type ModelDefinition,
} from '@orms/model-router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    requireAuth(req);
    const type = new URL(req.url).searchParams.get('type');
    if (type != null && type !== 'image' && type !== 'video') {
      throw new LocalizedError({ code: 'models.typeInvalid', status: 400 });
    }
    const definitions = await listModelDefinitions(type ?? undefined);
    const out: { images?: ModelDefinition[]; videos?: ModelDefinition[] } = {};
    if (!type || type === 'image') out.images = definitions.images;
    if (!type || type === 'video') out.videos = definitions.videos;
    return json(out);
  } catch (e) {
    if (e instanceof LocalizedError || e instanceof AuthError) {
      return handleError(e);
    }
    return handleError(normalizeError(e));
  }
}
