import type { ModelDefinition } from '@orms/model-router';
import { LocalizedError } from '@orms/generation-runtime';

function canonicalParam(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
}

function hasDeclaredParam(model: ModelDefinition, param: string): boolean {
  const wanted = canonicalParam(param);
  if (model.supportedParams.some((candidate) => canonicalParam(candidate) === wanted)) return true;

  if (wanted === 'resolution') return (model.limits.supportedResolutions?.length ?? 0) > 0;
  if (wanted === 'aspect_ratio') return (model.limits.supportedAspectRatios?.length ?? 0) > 0;
  if (wanted === 'size') return (model.limits.supportedSizes?.length ?? 0) > 0;
  return false;
}

export function assertSupportedControls(model: ModelDefinition, controls: string[]): void {
  for (const control of controls) {
    if (!hasDeclaredParam(model, control)) {
      throw new LocalizedError({
        code: 'generate.unsupportedParameter',
        params: { parameter: control },
        status: 400,
      });
    }
  }
}

export function assertReferenceCapability(model: ModelDefinition): void {
  const capability = model.mediaType === 'video' ? 'image-to-video' : 'image-to-image';
  if (!model.capabilities.includes(capability)) {
    throw new LocalizedError({ code: 'generate.referenceUnsupported', status: 400 });
  }
}

export function assertStreamingCapability(model: ModelDefinition): void {
  if (!model.supportsStreaming) {
    throw new LocalizedError({ code: 'generate.streamingUnsupported', status: 400 });
  }
}
