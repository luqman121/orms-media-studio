// OpenRouter adapter: maps OpenRouter's model shapes into ORMS ModelDefinitions and
// derives typed capabilities. This is the only adapter shipped in Increment 1.
import type { ImageModel, VideoModel } from '@orms/openrouter';
import { listImageModels, listVideoModels } from '@orms/openrouter';
import type { MediaCapability, ModelDefinition, NormalizedError } from './types';
import { estimateCredits, pricingUnit } from './credits';

const PROVIDER = 'openrouter';

function imageCapabilities(m: ImageModel): MediaCapability[] {
  const caps: MediaCapability[] = ['text-to-image'];
  const params = Object.keys(m.supported_parameters || {});
  // OpenRouter image models that accept reference images support image-to-image.
  if (params.some((p) => /input_reference|image|reference/i.test(p))) caps.push('image-to-image');
  if (params.some((p) => /mask|inpaint/i.test(p))) caps.push('inpainting');
  return caps;
}

function imageToDefinition(m: ImageModel): ModelDefinition {
  return {
    id: m.id,
    provider: PROVIDER,
    displayName: m.name || m.id,
    mediaType: 'image',
    capabilities: imageCapabilities(m),
    supportedParams: Object.keys(m.supported_parameters || {}),
    supportsStreaming: !!m.supports_streaming,
    pricing: { unit: pricingUnit('image'), estimatedCredits: estimateCredits('image') },
    limits: {},
    enabled: true,
  };
}

function videoToDefinition(m: VideoModel): ModelDefinition {
  const supportedParams = m.allowed_passthrough_parameters || [];
  const normalizedParams = supportedParams.map((param) => param.toLowerCase().replace(/[-\s]/g, '_'));
  const supportsReferenceImage = normalizedParams.some((param) =>
    ['frame_images', 'first_frame', 'image', 'image_url', 'input_reference', 'input_references'].includes(param),
  );
  return {
    id: m.id,
    provider: PROVIDER,
    displayName: m.name || m.id,
    mediaType: 'video',
    capabilities: supportsReferenceImage ? ['text-to-video', 'image-to-video'] : ['text-to-video'],
    supportedParams,
    supportsStreaming: false,
    pricing: { unit: pricingUnit('video'), estimatedCredits: estimateCredits('video') },
    limits: {
      supportedAspectRatios: m.supported_aspect_ratios || [],
      supportedResolutions: m.supported_resolutions || [],
      supportedSizes: m.supported_sizes || [],
    },
    enabled: true,
  };
}

export async function listImageModelDefinitions(): Promise<ModelDefinition[]> {
  const models = await listImageModels();
  return models.map(imageToDefinition);
}

export async function listVideoModelDefinitions(): Promise<ModelDefinition[]> {
  const models = await listVideoModels();
  return models.map(videoToDefinition);
}

/** Map any thrown provider error into a user-safe, localized shape. */
export function normalizeError(err: unknown): NormalizedError {
  const detail = err instanceof Error ? err.message : String(err);
  const lower = detail.toLowerCase();
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { code: 'timeout', detail, messageAr: 'انتهت مهلة التوليد. حاول مرة أخرى.', retryable: true };
  }
  if (/\b(400|422|invalid|unsupported)\b/.test(lower)) {
    return { code: 'invalid_input', detail, messageAr: 'تعذّر قبول الطلب من المزود. تحقّق من الإعدادات.', retryable: false };
  }
  if (/\b(401|403|api key|unauthorized)\b/.test(lower)) {
    return { code: 'provider_auth', detail, messageAr: 'مشكلة في اعتماد المزود. تواصل مع الدعم.', retryable: false };
  }
  if (/\b(429|rate)\b/.test(lower)) {
    return { code: 'rate_limited', detail, messageAr: 'ضغط مرتفع على المزود. حاول بعد قليل.', retryable: true };
  }
  return { code: 'provider_error', detail, messageAr: 'فشل التوليد لدى المزود. حاول مرة أخرى.', retryable: true };
}
