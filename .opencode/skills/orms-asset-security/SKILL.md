---
name: orms-asset-security
description: Load when implementing or reviewing asset access, asset ownership checks, R2 signed URLs, the GET /api/assets/[filename] route, provider-output download (SSRF), upload validation, or any authorization boundary around generations, projects, assets, or the SSE stream. Enforces authentication + ownership scoping, private R2 storage with short-lived signed access, and cross-user denial.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-asset-security

## When to use
For all work on `GET /api/assets/[filename]`, asset/project/generation ownership checks, R2
signing, provider-output download, upload validation, and SSE stream authorization.

## Files to inspect first
- `apps/web/app/api/assets/[filename]/route.ts` (currently **unauthenticated** — a known gap)
- `apps/web/lib/storage.ts` (`putObject`, `getSignedDownloadUrl`, `deleteObject`)
- `apps/web/lib/auth.ts` (`requireAuth(req)`, `AuthError`)
- `apps/web/lib/http.ts` (`parseRequest`, MIME/size validation, `MAX_UPLOAD_BYTES`)
- `apps/web/lib/serialize.ts` (asset_url shape)
- `packages/db/prisma/schema.prisma` — `Asset`, `Generation` (both `userId`-scoped)
- `IMPLEMENTATION_PLAN.md` §13 (security), §14 (required tests), §9 Phase 2b asset route security

## Required workflow
1. Every by-id route is scoped `where: { id, userId }`; never authorize by object key alone (keys are guessable).
2. `GET /api/assets/[filename]` must (a) require authentication **and** (b) verify the caller **owns**
   the `Asset` (and/or the owning `Generation`) before minting access.
3. Keep R2 storage **private**; issue **short-lived signed URLs** (`getSignedDownloadUrl`) or proxy
   through a same-origin authenticated endpoint.
4. `<img>`/`<video>` tags cannot send `Bearer` headers — mint a signed/tokenized URL from an
   authenticated endpoint on demand.
5. Provider-output retrieval is **server-side only** with an SSRF allowlist, max size, and timeout.
6. Uploads pass MIME + magic-byte signature + size validation (`MAX_UPLOAD_BYTES` = 50 MB).
7. SSE streams authenticate and verify generation ownership (no cross-user leaks).

## Invariants
- Authentication is required for all asset/project/generation/event access.
- Authorization is **ownership-based**, never object-key-based.
- No provider keys or R2 keys reach the browser.
- Signed URLs are short-lived; storage objects are private by default.
- Provider-output downloads are SSRF-safe (allowlist + size + timeout).

## Prohibited shortcuts
- Authorizing by filename/storage key without an ownership DB lookup.
- Making the R2 bucket public to "simplify" the route.
- Downloading provider output without a timeout/size cap or allowlist.
- Logging secrets, full prompts, or tokens.

## Verification commands
```bash
grep -rn "requireAuth" apps/web/app/api          # every protected route must call it
npm run build
# Tests (Phase 5): unauthenticated / wrong-user / missing / owner access for assets;
# cross-user SSE denial; SSRF allowlist enforcement; upload validation rejection.
```

## Evidence required before claiming completion
- Test results for: unauthenticated access denied, wrong-user denied, missing 404, owner allowed.
- Proof the asset route no longer authorizes by key alone.
- Proof signed URLs expire and storage is private.

## Definition of done
Asset/project/generation/event access is authentication + ownership-scoped, storage is private
with short-lived signed access, provider output is downloaded safely, and cross-user denial is
proven by deterministic tests.