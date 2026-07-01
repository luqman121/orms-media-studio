// Map Prisma models back to the snake_case JSON shape the frontend/API contract
// expects (unchanged from the Express/SQLite era). Dates → ISO 8601 strings.
import type { Generation, User } from '@orms/db';

function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : d;
}

export function serializeUser(u: Pick<User, 'id' | 'email' | 'name' | 'createdAt'>) {
  return { id: u.id, email: u.email, name: u.name, created_at: iso(u.createdAt) };
}

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
    created_at: iso(g.createdAt),
    updated_at: iso(g.updatedAt),
    asset_urls,
  };
}
