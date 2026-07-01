// Ported from backend/src/routes/models.js — GET /api/models?type=image|video
import { requireAuth, AuthError } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { listImageModels, listVideoModels, type ImageModel, type VideoModel } from '@orms/openrouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    requireAuth(req);
    const type = new URL(req.url).searchParams.get('type');
    const out: { images?: ImageModel[]; videos?: VideoModel[] } = {};
    if (!type || type === 'image') out.images = await listImageModels();
    if (!type || type === 'video') out.videos = await listVideoModels();
    return json(out);
  } catch (e) {
    if (e instanceof AuthError) return handleError(e);
    console.error('models:', (e as Error).message);
    return json({ error: 'فشل جلب النماذج من OpenRouter', detail: (e as Error).message }, 502);
  }
}
