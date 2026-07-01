// OpenRouter API client — typed wrappers for image + video endpoints.
// Ported from backend/src/services/openrouter.js. Uses the global fetch (Node 20+).
import { readFileSync } from 'node:fs';

// ---- Config (read lazily so runtime env is always respected) ----
export const BASE = process.env.OPENROUTER_BASE || 'https://openrouter.ai/api/v1';

function apiKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}
function appReferer(): string {
  return process.env.APP_REFERER || 'http://localhost:3001';
}
function appTitle(): string {
  return process.env.APP_TITLE || 'OpenRouter Media Studio';
}

export function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': appReferer(),
    'X-Title': appTitle(),
    ...(extra || {}),
  };
}

// ---- Types ----
export interface ImageModel {
  id: string;
  name: string;
  description?: string;
  supported_parameters: Record<string, unknown>;
  supports_streaming: boolean;
  type: 'image';
}

export interface VideoModel {
  id: string;
  name: string;
  description?: string;
  supported_resolutions: string[];
  supported_aspect_ratios: string[];
  supported_sizes: string[];
  pricing_skus: Record<string, unknown>;
  allowed_passthrough_parameters: string[];
  type: 'video';
}

export interface Usage {
  cost?: number | string;
  [k: string]: unknown;
}

export interface ImageItem {
  b64_json?: string;
  media_type?: string;
  [k: string]: unknown;
}

export interface ImageGenResult {
  data?: ImageItem[];
  usage?: Usage;
  [k: string]: unknown;
}

export interface VideoSubmitResult {
  id: string;
  polling_url?: string;
  status?: string;
  [k: string]: unknown;
}

export interface VideoPollResult {
  status: string;
  unsigned_urls?: string[];
  usage?: Usage;
  error?: string;
  [k: string]: unknown;
}

// ---- Model list cache (1h, in-process) ----
const MODEL_CACHE_MS = 60 * 60 * 1000;

let _imageModelsCache: ImageModel[] | null = null;
let _imageModelsAt = 0;
let _videoModelsCache: VideoModel[] | null = null;
let _videoModelsAt = 0;

export async function listImageModels(): Promise<ImageModel[]> {
  if (_imageModelsCache && Date.now() - _imageModelsAt < MODEL_CACHE_MS) return _imageModelsCache;
  const r = await fetch(`${BASE}/images/models`, { headers: headers() });
  if (!r.ok) throw new Error(`Image models: ${r.status} ${await r.text()}`);
  const j = (await r.json()) as { data?: any[] };
  _imageModelsCache = (j.data || []).map((m): ImageModel => ({
    id: m.id,
    name: m.name,
    description: m.description,
    supported_parameters: m.supported_parameters || {},
    supports_streaming: !!m.supports_streaming,
    type: 'image',
  }));
  _imageModelsAt = Date.now();
  return _imageModelsCache;
}

export async function listVideoModels(): Promise<VideoModel[]> {
  if (_videoModelsCache && Date.now() - _videoModelsAt < MODEL_CACHE_MS) return _videoModelsCache;
  const r = await fetch(`${BASE}/videos/models`, { headers: headers() });
  if (!r.ok) throw new Error(`Video models: ${r.status} ${await r.text()}`);
  const j = (await r.json()) as { data?: any[] };
  _videoModelsCache = (j.data || []).map((m): VideoModel => ({
    id: m.id,
    name: m.name,
    description: m.description,
    supported_resolutions: m.supported_resolutions || [],
    supported_aspect_ratios: m.supported_aspect_ratios || [],
    supported_sizes: m.supported_sizes || [],
    pricing_skus: m.pricing_skus || {},
    allowed_passthrough_parameters: m.allowed_passthrough_parameters || [],
    type: 'video',
  }));
  _videoModelsAt = Date.now();
  return _videoModelsCache;
}

// Synchronous image generation — returns { data: [{ b64_json }], usage }
export async function generateImage(body: Record<string, unknown>): Promise<ImageGenResult> {
  const r = await fetch(`${BASE}/images`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Image gen ${r.status}: ${text}`);
  return JSON.parse(text) as ImageGenResult;
}

// Async video generation — submit returns { id, polling_url, status }
export async function submitVideo(body: Record<string, unknown>): Promise<VideoSubmitResult> {
  const r = await fetch(`${BASE}/videos`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Video submit ${r.status}: ${text}`);
  return JSON.parse(text) as VideoSubmitResult;
}

// Poll video job — returns full status object
export async function pollVideo(jobId: string): Promise<VideoPollResult> {
  const r = await fetch(`${BASE}/videos/${jobId}`, { headers: headers() });
  const text = await r.text();
  if (!r.ok) throw new Error(`Video poll ${r.status}: ${text}`);
  return JSON.parse(text) as VideoPollResult;
}

// Download video content — returns Buffer
export async function downloadVideoContent(jobId: string, index = 0): Promise<Buffer> {
  const r = await fetch(`${BASE}/videos/${jobId}/content?index=${index}`, { headers: headers() });
  if (!r.ok) throw new Error(`Video content ${r.status}: ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

// Convert a local file to a base64 data URL (for input_references / frame_images).
// NOTE: In Phase 4 this will read from object storage (R2) instead of disk.
export function fileToDataUrl(filePath: string, mimeType: string): string {
  const buf = readFileSync(filePath);
  return `data:${mimeType};base64,${buf.toString('base64')}`;
}

// Convert an in-memory buffer to a base64 data URL (storage-agnostic helper).
export function bufferToDataUrl(buf: Buffer | Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${Buffer.from(buf).toString('base64')}`;
}
