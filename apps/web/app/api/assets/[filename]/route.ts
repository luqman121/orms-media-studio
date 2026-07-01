// Phase 4: GET /api/assets/:filename
// Redirects to a pre-signed Cloudflare R2 URL (signed locally, no network call).
// The browser / video player follows the 307 and hits R2 directly — zero Next.js egress.
import path from 'node:path';
import { getSignedDownloadUrl } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ filename: string }> }) {
  const { filename } = await ctx.params;
  const key = path.basename(filename); // prevent path traversal
  const url = await getSignedDownloadUrl(key);
  return Response.redirect(url, 307);
}
