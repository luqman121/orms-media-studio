// Map Prisma models back to the snake_case JSON shape the frontend/API contract
// expects (unchanged from the Express/SQLite era). Dates → ISO 8601 strings.
import type { Asset, Generation, User } from '@orms/db';
import { getSignedDownloadUrl } from './storage';

// Signed-URL TTL for asset_urls minted by the async serializer. Short-lived per
// orms-asset-security. Kept in sync with the assets route TTL.
const SERIALIZED_ASSET_URL_TTL_SECONDS = 300;

function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : d;
}

export function serializeUser(u: Pick<User, 'id' | 'email' | 'name' | 'createdAt'>) {
  return { id: u.id, email: u.email, name: u.name, created_at: iso(u.createdAt) };
}

// Synchronous serializer: returns `/api/assets/{filename}` paths for asset_urls.
// Kept synchronous because the image route's idempotent short-circuit return
// (apps/web/app/api/generate/image/route.ts, a Slice 1/2 file that must not be
// touched in this slice) calls this directly without await. The generate page
// does NOT consume `asset_urls` from the image route (it uses `r.assets`), so
// these `/api/assets/...` paths never reach an `<img src>` from that caller.
export function serializeGeneration(g: Generation) {
  const asset_urls = String(g.assetPath || '')
    .split(',')
    .filter(Boolean)
    .map((fn) => `/api/assets/${fn}`);
  return {
    id: g.id,
    user_id: g.userId,
    type: g.type,
    model_id: g.modelId,
    model_name: g.modelName,
    prompt: g.prompt,
    params_json: g.paramsJson,
    status: g.status,
    job_id: g.jobId,
    polling_url: g.pollingUrl,
    asset_path: g.assetPath,
    asset_media_type: g.assetMediaType,
    thumbnail_path: g.thumbnailPath,
    cost: g.cost,
    error: g.error,
    duration_ms: g.durationMs,
    project_id: g.projectId,
    estimated_credits: g.estimatedCredits,
    reserved_credits: g.reservedCredits,
    final_credits: g.finalCredits,
    created_at: iso(g.createdAt),
    updated_at: iso(g.updatedAt),
    asset_urls,
  };
}

// Async serializer: identical output shape to serializeGeneration, but mints
// short-lived signed R2 URLs for `asset_urls` instead of `/api/assets/{fn}`
// paths. This is the orms-asset-security sanctioned pattern for `<img>`/
// `<video>` tags, which cannot attach a `Bearer` header — the signed URL
// carries its own HMAC and loads directly from private R2.
//
// Used by the authenticated generation list + detail endpoints (the dashboard
// gallery, history page, and the generate page's post-completion fetch). The
// output shape is backwards-compatible: clients reading `asset_url`/`asset_urls`
// get a working URL either way (signed URL now, `/api/assets/...` path before).
export async function serializeGenerationWithSignedUrls(g: Generation, options?: { retryable?: boolean }) {
  const keys = String(g.assetPath || '')
    .split(',')
    .filter(Boolean);
  const asset_urls = await Promise.all(
    keys.map((k) => getSignedDownloadUrl(k, SERIALIZED_ASSET_URL_TTL_SECONDS)),
  );
  return {
    id: g.id,
    user_id: g.userId,
    type: g.type,
    model_id: g.modelId,
    model_name: g.modelName,
    prompt: g.prompt,
    params_json: g.paramsJson,
    status: g.status,
    job_id: g.jobId,
    polling_url: g.pollingUrl,
    asset_path: g.assetPath,
    asset_media_type: g.assetMediaType,
    thumbnail_path: g.thumbnailPath,
    cost: g.cost,
    error: g.error,
    duration_ms: g.durationMs,
    project_id: g.projectId,
    estimated_credits: g.estimatedCredits,
    reserved_credits: g.reservedCredits,
    final_credits: g.finalCredits,
    created_at: iso(g.createdAt),
    updated_at: iso(g.updatedAt),
    asset_urls,
    ...(options ? { retryable: options.retryable === true } : {}),
  };
}

type LibraryAsset = Asset & {
  generation?: { prompt: string | null; modelId: string } | null;
  project?: { name: string } | null;
};

export async function serializeLibraryAsset(asset: LibraryAsset) {
  const signedUrl = await getSignedDownloadUrl(asset.storageKey, SERIALIZED_ASSET_URL_TTL_SECONDS);
  return {
    id: asset.id,
    generation_id: asset.generationId,
    project_id: asset.projectId,
    kind: asset.kind,
    media_type: asset.mediaType,
    name: asset.name,
    size_bytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
    duration_ms: asset.durationMs,
    favorite: asset.favorite,
    prompt: asset.generation?.prompt ?? null,
    model_id: asset.generation?.modelId ?? null,
    project_name: asset.project?.name ?? null,
    preview_url: signedUrl,
    download_url: signedUrl,
    created_at: iso(asset.createdAt),
  };
}
