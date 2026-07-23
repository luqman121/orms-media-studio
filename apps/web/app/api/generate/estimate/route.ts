import { estimateCredits, findModelDefinition, normalizeError } from '@orms/model-router';
import { LocalizedError } from '@orms/generation-runtime';
import { requireAuth } from '@/lib/auth';
import { getBalance } from '@/lib/credits';
import { handleError, json } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function boundedInteger(value: unknown, fallback: number, min: number, max: number, code: string): number {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new LocalizedError({ code, status: 400 });
  }
  return parsed;
}

export async function POST(req: Request) {
  try {
    const userId = requireAuth(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new LocalizedError({ code: 'generic.badRequest', status: 400 });
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new LocalizedError({ code: 'generic.badRequest', status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (typeof input.modelId !== 'string' || input.modelId.trim() === '') {
      throw new LocalizedError({ code: 'estimate.modelRequired', status: 400 });
    }
    const modelId = input.modelId.trim();
    const count = boundedInteger(input.count, 1, 1, 4, 'estimate.countInvalid');
    const durationSeconds = boundedInteger(
      input.durationSeconds,
      5,
      1,
      20,
      'estimate.durationInvalid',
    );

    let model;
    try {
      model = await findModelDefinition(modelId);
    } catch (error) {
      throw normalizeError(error);
    }
    if (!model || !model.enabled || (model.mediaType !== 'image' && model.mediaType !== 'video')) {
      throw new LocalizedError({ code: 'models.unavailable', status: 400 });
    }

    const estimatedCredits = estimateCredits(
      model.mediaType,
      model.mediaType === 'image' ? { count } : { durationSeconds },
    );
    const balance = await getBalance(userId);
    return json({
      modelId: model.id,
      mediaType: model.mediaType,
      estimatedCredits,
      balance,
      remainingAfter: Math.max(0, balance - estimatedCredits),
      canAfford: balance >= estimatedCredits,
    });
  } catch (error) {
    return handleError(error);
  }
}
