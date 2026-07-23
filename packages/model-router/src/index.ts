// @orms/model-router — provider-agnostic model catalog + credit economics for ORMS.
// Increment 1: OpenRouter only. Adapters for other providers plug into the same types.
export * from './types.js';
export * from './credits.js';
export {
  listImageModelDefinitions,
  listVideoModelDefinitions,
  normalizeError,
} from './openrouter.js';

import { listImageModelDefinitions, listVideoModelDefinitions } from './openrouter.js';
import type { ModelDefinition } from './types.js';

/** Combined catalog (enabled models only), used by the models API + composer. */
export async function listModelDefinitions(type?: 'image' | 'video'): Promise<{
  images: ModelDefinition[];
  videos: ModelDefinition[];
}> {
  const [images, videos] = await Promise.all([
    !type || type === 'image' ? listImageModelDefinitions() : Promise.resolve([]),
    !type || type === 'video' ? listVideoModelDefinitions() : Promise.resolve([]),
  ]);
  return { images: images.filter((m) => m.enabled), videos: videos.filter((m) => m.enabled) };
}

/** Find one model definition by id across image + video catalogs. */
export async function findModelDefinition(id: string): Promise<ModelDefinition | undefined> {
  const { images, videos } = await listModelDefinitions();
  return [...images, ...videos].find((m) => m.id === id);
}
