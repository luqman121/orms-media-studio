# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Arabic RTL web studio that generates images and videos from prompts via the **OpenRouter API**. A single **Next.js 15** app (`apps/web`) serves both the UI and the API, backed by shared workspace packages. The UI text and error messages are in Arabic — keep new user-facing strings Arabic to match.

## Migration status (Next.js monorepo)

A phased migration to a scalable Next.js architecture is underway (see `C:\Users\luqma\.claude\plans\please-inspect-the-project-ticklish-quasar.md`). **Phases 1–2 are done:** the legacy Vite `frontend/` and Express `backend/` have been **removed**; everything now lives in an npm-workspace monorepo:
- `apps/web` — Next.js 15 App Router (TS strict, Tailwind RTL). UI pages **and** the API (native route handlers in `app/api/**`) on one origin (**:3000**). No CORS, no proxy.
- `apps/worker` — placeholder for the Phase 5 BullMQ video-poll worker.
- `packages/openrouter` — typed OpenRouter client (`packages/openrouter/src/index.ts`).
- `packages/db` — Prisma schema mirroring the SQLite tables (`packages/db/prisma/schema.prisma`); wired up in Phase 3.

**Not yet migrated (still on the Phase-1/2 stopgaps):** persistence is **`node:sqlite`** (Node's built-in SQLite, `apps/web/lib/db.ts`) — chosen over `better-sqlite3` to avoid a native toolchain and because **Node 22+ is required** for it; assets/uploads are on **local disk** (`apps/web/lib/storage.ts`); the video poller is still **fire-and-forget in-process** (`apps/web/lib/videoPoll.ts`). Phase 3 → Postgres/Prisma, Phase 4 → R2, Phase 5 → BullMQ.

## Commands

Everything runs from the repo root (npm workspaces):
```bash
npm install
JWT_SECRET=... OPENROUTER_API_KEY=sk-or-v1-... npm run dev   # Next dev on http://localhost:3000
npm run build                                                # production build (.next/standalone)
npm start                                                    # serve the production build
```

Full stack via Docker (single Next.js container serving UI + API on 3000):
```bash
docker compose up --build -d   # http://localhost:3000
```

There is **no test suite or configured linter** — `npm test` will fail. `npm run build` **does** run strict TypeScript type-checking (ESLint is skipped in builds via `next.config.ts`).

## Architecture

**Request flow:** browser → `apps/web/lib/api.ts` (injects JWT from `localStorage['orms_token']`) → same-origin `/api/*` **route handlers** (`apps/web/app/api/**/route.ts`) → `packages/openrouter` → OpenRouter (`https://openrouter.ai/api/v1`).

**Route handlers** live under `apps/web/app/api/`: `auth/{register,login,me}`, `models` (+`/image`,`/video`), `generate/{image,video}`, `generate/generations` (+`/[id]`, `/[id]/poll`), `assets/[filename]`, `health`. Shared logic is in `apps/web/lib/`: `db.ts` (`node:sqlite` singleton + inline migrations), `auth.ts` (`sign` + `requireAuth(req)` — throws `AuthError`, no Express middleware), `http.ts` (`json()`, `parseRequest()` for multipart-or-JSON replacing multer, `handleError()`), `storage.ts` (disk paths), `videoPoll.ts` (background poll). All handlers set `runtime='nodejs'` + `dynamic='force-dynamic'`.

**Generation is the core, and the three modes differ fundamentally:**
- **Image, sync** (`POST /api/generate/image`) — calls OpenRouter, decodes `b64_json`, sniffs magic bytes (Gemini mislabels JPEG as PNG), writes to `ASSETS_DIR`, returns immediately.
- **Image, streaming SSE** — same endpoint with `stream:true`; only some models set `supports_streaming` (GPT-Image, GPT-5, Gemini, etc.). Server proxies OpenRouter's SSE, forwards `partial`/`completed` events to the client, and persists the final image.
- **Video, async** (`POST /api/generate/video`) — submits a job, responds with `job_id` right away, then a **fire-and-forget `pollAndDownloadVideo()`** polls every 10s (≤15 min) in-process and downloads the mp4 when done. The client can also force a check via `POST /api/generate/generations/:id/poll`. This background task is why the backend needs a long-running server (see below).

Reference images: sent as multipart `image`, parsed by `parseRequest()`, written to `UPLOADS_DIR`, and inlined as base64 data URLs (`orouter.bufferToDataUrl`) — as `input_references` for image-to-image, or `frame_images` (`first_frame`) for image-to-video. No separate upload endpoint.

**Persistence:** every generation is one `generations` row (schema + migrations inline in `apps/web/lib/db.ts`), tracked through `status` (`pending`→`in_progress`→`completed`/`failed`). `asset_path` is a **comma-separated** list of filenames served by `GET /api/assets/:file`; routes split it into `asset_urls`. All rows are scoped by `user_id` — history and detail queries always filter on the JWT's user.

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

Deploy as a **single long-running container** (`Dockerfile` builds the Next.js `standalone` output; `docker-compose.yml` runs it on :3000 with `./data:/app/data`). Target a container host (Render/Railway/Fly/VPS) with a persistent volume at `/app/data`. **Do not use Vercel serverless** while the app still relies on `node:sqlite`, local-disk assets, and the in-process video poll — those need a stateful long-running server (Phases 3–5 remove those constraints). The base image is **`node:24`** because `node:sqlite` needs Node 22+. See `DEPLOY.md`.

## Environment variables

`OPENROUTER_API_KEY` (required for generation/models), `JWT_SECRET` (defaults to an insecure dev value — set it in prod), `PORT` (3000), `HOSTNAME` (0.0.0.0 in Docker), `DATA_DIR` (root for the DB + uploads + assets; defaults to `<app cwd>/data`), or override individually with `DB_PATH`/`UPLOADS_DIR`/`ASSETS_DIR`, and `APP_REFERER`/`APP_TITLE` (sent as OpenRouter `HTTP-Referer`/`X-Title`). No `CORS_ORIGIN` — the API is same-origin now. Phase 3+ adds `DATABASE_URL` / `REDIS_URL`.
