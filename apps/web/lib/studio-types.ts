export type MediaMode = 'image' | 'video';

export interface ModelDefinition {
  id: string;
  provider: string;
  displayName: string;
  mediaType: MediaMode;
  capabilities: string[];
  supportedParams: string[];
  supportsStreaming: boolean;
  pricing: {
    unit: string;
    estimatedCredits: number;
  };
  limits: {
    maxImages?: number;
    maxDurationSeconds?: number;
    supportedAspectRatios?: string[];
    supportedResolutions?: string[];
  };
  enabled: boolean;
}

export interface Project {
  id: number;
  name: string;
  archived?: boolean;
  created_at: string;
  updated_at: string;
  asset_count?: number;
  generation_count?: number;
}

export interface Asset {
  id: number;
  generation_id?: number | null;
  project_id?: number | null;
  kind: MediaMode;
  media_type: string;
  name?: string | null;
  favorite: boolean;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  size_bytes?: number | null;
  created_at: string;
  url: string;
}

export interface Generation {
  id: number;
  type: MediaMode;
  model_id: string;
  model_name?: string | null;
  prompt?: string | null;
  params_json?: string | Record<string, unknown> | null;
  status: string;
  asset_media_type?: string | null;
  cost?: string | number | null;
  error?: string | null;
  duration_ms?: number | null;
  created_at: string;
  updated_at?: string;
  asset_urls?: string[];
  project_id?: number | null;
  estimated_credits?: number | null;
  reserved_credits?: number | null;
  final_credits?: number | null;
  retryable?: boolean;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function parseGenerationParams(value: Generation['params_json']): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
