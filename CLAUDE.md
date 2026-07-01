# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Arabic RTL web studio that generates images and videos from prompts via the **OpenRouter API**. A single **Next.js 15** app (`apps/web`) serves both the UI and the API, backed by shared workspace packages. The UI text and error messages are in Arabic — keep new user-facing strings Arabic to match.

## Migration status (Next.js monorepo)

A phased migration to a scalable Next.js architecture is underway (see `C:\Users\luqma\.claude\plans\please-inspect-the-project-ticklish-quasar.md`). **Phases 1–3 are done:** the legacy Vite `frontend/` and Express `backend/` have been **removed**; everything now lives in an npm-workspace monorepo:
- `apps/web` — Next.js 15 App Router (TS strict, Tailwind RTL). UI pages **and** the API (native route handlers in `app/api/**`) on one origin (**:3000**). No CORS, no proxy.
- `apps/worker` — placeholder for the Phase 5 BullMQ video-poll worker.
- `packages/openrouter` — typed OpenRouter client (`packages/openrouter/src/index.ts`).
- `packages/db` — **Prisma + PostgreSQL**: schema, client singleton, and migrations (`packages/db/prisma/`). Route handlers use `import { prisma } from '@orms/db'`.

**Persistence is PostgreSQL via Prisma** (Phase 3 done). `apps/web/lib/serialize.ts` maps Prisma models back to the original snake_case API shape (`created_at`, `asset_urls`, …) so the frontend contract is unchanged. **Not yet migrated:** assets/uploads are still on **local disk** (`apps/web/lib/storage.ts`, Phase 4 → R2); the video poller is still **fire-and-forget in-process** (`apps/web/lib/videoPoll.ts`, Phase 5 → BullMQ). `node:sqlite` survives only in `scripts/migrate-sqlite-to-pg.ts` (one-time SQLite→PG import), which is why **Node 22+ is still required**.

## Commands

Everything runs from the repo root (npm workspaces). `dev`/`build` run `prisma generate` first. Put `DATABASE_URL` (+ `JWT_SECRET`, `OPENROUTER_API_KEY`) in a gitignored `.env`:
```bash
npm install
npm run dev            # prisma generate + Next dev on http://localhost:3000
npm run build          # prisma generate + production build (.next/standalone)
npm start              # serve the production build
npm run migrate        # prisma migrate dev (create/apply a migration)
npm run migrate:deploy # apply committed migrations (prod)
npm run db:seed-from-sqlite   # one-time SQLite→Postgres data import
```
On a hosted Postgres that blocks shadow DBs (e.g. Supabase), use `prisma db push` + a baselined migration instead of `migrate dev` (that's how `packages/db/prisma/migrations/0_init` was created). Supabase needs the **IPv4 session pooler** URL (`...pooler.supabase.com:5432`), not the IPv6-only direct host.

Full stack via Docker (single Next.js container serving UI + API on 3000):
```bash
docker compose up --build -d   # http://localhost:3000
```

There is **no test suite or configured linter** — `npm test` will fail. `npm run build` **does** run strict TypeScript type-checking (ESLint is skipped in builds via `next.config.ts`).

## Architecture

**Request flow:** browser → `apps/web/lib/api.ts` (injects JWT from `localStorage['orms_token']`) → same-origin `/api/*` **route handlers** (`apps/web/app/api/**/route.ts`) → `@orms/db` (Prisma/Postgres) and `packages/openrouter` → OpenRouter (`https://openrouter.ai/api/v1`).

**Route handlers** live under `apps/web/app/api/`: `auth/{register,login,me}`, `models` (+`/image`,`/video`), `generate/{image,video}`, `generate/generations` (+`/[id]`, `/[id]/poll`), `assets/[filename]`, `health`. Shared logic is in `apps/web/lib/`: `auth.ts` (`sign` + `requireAuth(req)` — throws `AuthError`, no Express middleware), `http.ts` (`json()`, `parseRequest()` for multipart-or-JSON replacing multer, `handleError()`), `serialize.ts` (Prisma → snake_case API shape), `storage.ts` (disk paths), `videoPoll.ts` (background poll). DB access is `import { prisma } from '@orms/db'`. All handlers set `runtime='nodejs'` + `dynamic='force-dynamic'`. Prisma is external (`serverExternalPackages` in `next.config.ts`), and the Docker runner copies `.prisma`/`@prisma` so the query engine is present at runtime.

**Generation is the core, and the three modes differ fundamentally:**
- **Image, sync** (`POST /api/generate/image`) — calls OpenRouter, decodes `b64_json`, sniffs magic bytes (Gemini mislabels JPEG as PNG), writes to `ASSETS_DIR`, returns immediately.
- **Image, streaming SSE** — same endpoint with `stream:true`; only some models set `supports_streaming` (GPT-Image, GPT-5, Gemini, etc.). Server proxies OpenRouter's SSE, forwards `partial`/`completed` events to the client, and persists the final image.
- **Video, async** (`POST /api/generate/video`) — submits a job, responds with `job_id` right away, then a **fire-and-forget `pollAndDownloadVideo()`** polls every 10s (≤15 min) in-process and downloads the mp4 when done. The client can also force a check via `POST /api/generate/generations/:id/poll`. This background task is why the backend needs a long-running server (see below).

Reference images: sent as multipart `image`, parsed by `parseRequest()`, written to `UPLOADS_DIR`, and inlined as base64 data URLs (`orouter.bufferToDataUrl`) — as `input_references` for image-to-image, or `frame_images` (`first_frame`) for image-to-video. No separate upload endpoint.

**Persistence:** PostgreSQL via Prisma (`packages/db/prisma/schema.prisma`; models `User`, `Generation`, `UploadedImage`, `ModelCache`). Every generation is one `Generation` row, tracked through `status` (`pending`→`in_progress`→`completed`/`failed`). `assetPath` is a **comma-separated** list of filenames; `serializeGeneration` turns it into `asset_urls` (served by `GET /api/assets/:file`) and maps camelCase→snake_case. All rows are scoped by `userId` — history/detail queries always filter on the JWT's user (`findFirst({ where: { id, userId } })`).

**Model lists** are fetched from OpenRouter and cached in-process for 1 hour (`packages/openrouter`), keyed by image vs video.

## Design system (read before any UI work)

**Before writing or changing any frontend/UI code (components, pages, styles, layouts), read [`DESIGN.md`](./DESIGN.md) first.** It is the authoritative design system for ORMS and defines the full token set, component specs, layout/wireframes, and copy. Do not invent colors, spacing, radii, or Arabic microcopy — pull them from that file.

Non-negotiable rules (see `DESIGN.md` for the rest):
- **Palette:** dark premium studio — midnight background (`#07040D`/`#100C1B`), violet primary (`#864FF2`), blue/cyan accents (`#5195ED`/`#36C4F0`). Green (`#43F994`) is **success states only**, never a primary/brand color. No pure-white backgrounds.
- **Tokens over literals:** use the CSS variables (`DESIGN.md` §19) or Tailwind tokens (§18) — never hard-code hex/spacing/radius in components.
- **RTL-first Arabic:** layouts must be RTL-native (sidebar on the right, history panel on the left), and all user-facing strings Arabic — reuse the microcopy library (§24) and section copy rather than translating ad hoc.
- **Required states:** every interactive surface needs loading (purple shimmer skeleton), success, error, empty, disabled, and visible focus (`:focus-visible` cyan ring) states (§13, §16).
- **Prompt-first & one clear CTA:** the prompt box is the hero element; each screen pushes one primary action (§2).
- **Reusable primitives:** build on shared UI components (Button, Card, Input, Textarea, Badge, Tabs, Modal, Skeleton), keeping generator image/video settings modular (§20, §29).

Run the Design QA checklist (§28) before considering UI work done.

## Deployment (self-hosted, not serverless)

Deploy as a **single long-running container** (`Dockerfile` builds the Next.js `standalone` output; `docker-compose.yml` runs `db` (Postgres) → `migrate` (one-shot `prisma migrate deploy`) → `web` on :3000 with `./data:/app/data`). Target a container host (Render/Railway/Fly/VPS) with managed Postgres + a persistent volume at `/app/data` (still needed for local-disk assets until Phase 4 → R2). **Do not use Vercel serverless** while the app still relies on local-disk assets and the in-process video poll. Base image is **`node:24`**. The Docker changes for Phase 3 (Prisma engine copy, `migrate` service) were **not built locally** (no Docker daemon in the dev env) — verify with `docker compose build` before deploying. See `DEPLOY.md`.

## Environment variables

`DATABASE_URL` (**required** — Postgres; on Supabase use the IPv4 session-pooler host), `OPENROUTER_API_KEY` (required for generation/models), `JWT_SECRET` (defaults to an insecure dev value — set it in prod), `PORT` (3000), `HOSTNAME` (0.0.0.0 in Docker), `DATA_DIR` (root for uploads + assets; defaults to `<app cwd>/data`) or override with `UPLOADS_DIR`/`ASSETS_DIR`, and `APP_REFERER`/`APP_TITLE` (sent as OpenRouter `HTTP-Referer`/`X-Title`). No `CORS_ORIGIN` — same-origin. Phase 5 adds `REDIS_URL`.
