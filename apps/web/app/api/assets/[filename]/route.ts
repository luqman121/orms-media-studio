// Phase 2b Slice 4: GET /api/assets/:filename
// Authenticated + ownership-scoped 307 redirect to a short-lived signed R2 URL.
//
// The browser / video player follows the 307 and hits R2 directly — zero Next.js
// egress. The signed URL carries its own HMAC so `<img>`/`<video>` tags (which
// cannot attach a `Bearer` header) can load it without authentication headers.
//
// Security model (per orms-asset-security):
//   1. requireAuth(req) — throws AuthError (401) if no/invalid Bearer token.
//   2. path.basename(filename) — neutralizes path traversal (`..`, absolute paths).
//   3. Ownership lookup (NEVER by object key alone — keys are guessable):
//        a. Asset row by { storageKey: key, userId }
//        b. fallback Generation row by { assetPath: key, userId } (legacy data
//           that predates the normalized Asset rows from Slices 1/2).
//      If neither is owned by the caller → 404 (Arabic). Cross-user denial.
//   4. Mint a short-lived signed URL (300s) via getSignedDownloadUrl(key, 300).
//   5. 307 redirect to the signed URL. R2 stays private; no public bucket flag.
import path from 'node:path';
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { LocalizedError } from '@orms/generation-runtime';
import { getSignedDownloadUrl } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Signed URLs expire after 5 minutes — short-lived per orms-asset-security.
// The default in storage.ts (3600s) is intentionally NOT changed for other callers.
const ASSET_SIGNED_URL_TTL_SECONDS = 300;

export async function GET(req: Request, ctx: { params: Promise<{ filename: string }> }) {
  try {
    const userId = requireAuth(req);
    const { filename } = await ctx.params;
    // Neutralize path traversal: collapse to the final path component so
    // `../../etc/passwd` or `/abs/path` resolve to a safe bare filename.
    const key = path.basename(filename);

    // Ownership authorization — never authorize by object key alone.
    // (a) Normalized Asset row (Slices 1/2 write these for every generation).
    const asset = await prisma.asset.findFirst({
      where: { storageKey: key, userId },
      select: { id: true },
    });
    // (b) Legacy fallback: a Generation whose comma-separated assetPath
    //     contains this key (pre-backfill data without a matching Asset row).
    //     assetPath may be a single key or comma-separated keys; an exact
    //     match on the basename is sufficient because storage keys are unique.
    let owned = asset != null;
    if (!owned) {
      const gen = await prisma.generation.findFirst({
        where: { assetPath: key, userId },
        select: { id: true },
      });
      owned = gen != null;
    }

    if (!owned) {
      // Same response for "not found" and "exists but owned by another user"
      // to avoid leaking the existence of cross-user assets.
      throw new LocalizedError({ code: 'assets.notFound', status: 404 });
    }

    const url = await getSignedDownloadUrl(key, ASSET_SIGNED_URL_TTL_SECONDS);
    // Referrer-Policy: a signed R2 URL is a bearer token within its TTL. Suppress the
    // `Referer` header on the cross-origin redirect so the URL is not leaked to a
    // third-party page via the Referer header (defense-in-depth; see orms-asset-security).
    return new Response(null, {
      status: 307,
      headers: {
        Location: url,
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}