// POST /api/enhance-prompt
// Rewrites a short/weak user prompt into a detailed generation prompt via an
// OpenRouter chat model. Used by the generator dashboard's "Enhance Prompt with AI"
// button and the "Auto Enhance" toggle. No DB writes — stateless passthrough.
import * as orouter from '@orms/openrouter';
import { requireAuth, AuthError } from '@/lib/auth';
import { json, parseRequest, handleError } from '@/lib/http';
import { checkEnhanceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const userId = requireAuth(req);
    const rl = await checkEnhanceRateLimit(userId);
    if (!rl.allowed) {
      return Response.json(
        { error: 'تجاوزت حد الطلبات — حاول مرة أخرى قريباً', remaining: rl.remaining },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(0, Math.ceil((rl.reset - Date.now()) / 1000))),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    const { fields } = await parseRequest(req);
    const prompt = typeof fields.prompt === 'string' ? fields.prompt.trim() : '';
    const type = fields.type === 'video' ? 'video' : 'image';
    if (!prompt) return json({ error: 'البرومبت مطلوب' }, 400);
    if (!process.env.OPENROUTER_API_KEY) {
      return json({ error: 'مفتاح OpenRouter غير مُهيأ على الخادم' }, 502);
    }

    const enhancedPrompt = await orouter.enhancePrompt(prompt, type);
    return json({ enhancedPrompt, original: prompt });
  } catch (e) {
    if (e instanceof AuthError) return handleError(e);
    console.error('enhance-prompt:', (e as Error).message);
    return json({ error: 'فشل تحسين البرومبت', detail: (e as Error).message }, 502);
  }
}
