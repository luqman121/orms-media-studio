// Provider-agnostic model + capability contracts for ORMS.
// Increment 1 ships a single OpenRouter adapter; the interfaces below are the seam
// that future adapters (MuAPI / Fal / Replicate / WaveSpeed / ComfyUI) slot into.

export type MediaCapability =
  | 'text-to-image'
  | 'image-to-image'
  | 'inpainting'
  | 'text-to-video'
  | 'image-to-video'
  | 'lip-sync'
  | 'upscale'
  | 'background-removal'
  | 'audio-generation';

export type MediaType = 'image' | 'video' | 'audio';

export interface ModelLimits {
  maxImages?: number;
  maxDurationSeconds?: number;
  supportedAspectRatios?: string[];
  supportedResolutions?: string[];
}

export interface ModelPricing {
  /** Human unit, e.g. 'image' | 'second' | 'generation'. */
  unit: string;
  /** Config-driven pre-flight estimate in integer ORMS credits. */
  estimatedCredits: number;
}

export interface ModelDefinition {
  id: string;
  provider: string;
  displayName: string;
  mediaType: MediaType;
  capabilities: MediaCapability[];
  /** Which UI controls this model actually supports (drives capability-based UI). */
  supportedParams: string[];
  supportsStreaming: boolean;
  pricing: ModelPricing;
  limits: ModelLimits;
  enabled: boolean;
}

/** A normalized, user-safe error every adapter must produce. */
export interface NormalizedError {
  /** Stable machine code, e.g. 'provider_error' | 'timeout' | 'invalid_input'. */
  code: string;
  /** English/technical detail for logs (never secrets). */
  detail: string;
  /** Localized Arabic message safe to show the end user. */
  messageAr: string;
  /** Whether the caller may retry (and be billed again). */
  retryable: boolean;
}
