# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Arabic RTL web studio that generates images and videos from prompts via the **OpenRouter API**. Two separately-deployed parts: a Vite/React SPA (`frontend/`) and an Express + SQLite backend (`backend/`). The UI text and error messages are in Arabic — keep new user-facing strings Arabic to match.

## Migration status (Next.js monorepo — in progress)

A phased migration to a scalable Next.js architecture is underway (see `C:\Users\luqma\.claude\plans\please-inspect-the-project-ticklish-quasar.md`). **Phase 1 is done:** an npm-workspace monorepo now exists alongside the legacy code:
- `apps/web` — Next.js 15 App Router (TS, Tailwind RTL). Ports the three pages; runs on **:3000** and **proxies `/api/*` to the Express backend on :3001** (`apps/web/next.config.ts` `rewrites`). Dev: `npm run dev` at the repo root (set `BACKEND_ORIGIN` if the backend isn't on :3001). Still run the Express backend separately for the API.
- `apps/worker` — placeholder for the Phase 5 BullMQ video-poll worker.
- `packages/openrouter` — typed port of the OpenRouter client (`packages/openrouter/src/index.ts`).
- `packages/db` — Prisma schema mirroring the SQLite tables (`packages/db/prisma/schema.prisma`); runtime client lands in Phase 3.

The legacy `frontend/` (Vite) and `backend/` (Express) are still the source of truth for the API and remain runnable per the commands below. Phase 2 ports the API into `apps/web` route handlers and removes Express. Until then, everything below still applies.

## Commands

Backend (port 3001):
```bash
cd backend && npm install
OPENROUTER_API_KEY=sk-or-v1-xxx JWT_SECRET=$(openssl rand -hex 32) npm start
```

Frontend (port 5173, proxies `/api` → `localhost:3001`):
```bash
cd frontend && npm install
npm run dev          # dev server
npm run build        # production bundle → frontend/dist
```

Full stack via Docker (builds frontend, backend serves it as static + API on 3001):
```bash
docker compose up --build -d   # http://localhost:3001
```

There is **no test suite, linter, or typecheck** configured — `npm test` will fail. Both packages are plain JS (backend CommonJS, frontend ESM).

## Architecture

**Request flow:** browser → `frontend/src/lib/api.js` (injects JWT from `localStorage['orms_token']`) → `/api/*` → Express routes → `backend/src/services/openrouter.js` → OpenRouter (`https://openrouter.ai/api/v1`).

**Backend layout** (`backend/src/`): `index.js` bootstraps Express, eagerly opens the DB (runs migrations), mounts routes, and — in production — serves the built frontend from the first existing dir among `$STATIC_DIR`, `../public` (Docker), `../../frontend/dist`. All non-`/api` paths fall back to `index.html` (SPA). `routes/` holds `auth`, `models`, `generate`, `assets`; `services/openrouter.js` is the single OpenRouter client; `db/database.js` is a `better-sqlite3` singleton; `middleware/auth.js` does JWT.

**Generation is the core, and the three modes differ fundamentally:**
- **Image, sync** (`POST /api/generate/image`) — calls OpenRouter, decodes `b64_json`, sniffs magic bytes (Gemini mislabels JPEG as PNG), writes to `ASSETS_DIR`, returns immediately.
- **Image, streaming SSE** — same endpoint with `stream:true`; only some models set `supports_streaming` (GPT-Image, GPT-5, Gemini, etc.). Server proxies OpenRouter's SSE, forwards `partial`/`completed` events to the client, and persists the final image.
- **Video, async** (`POST /api/generate/video`) — submits a job, responds with `job_id` right away, then a **fire-and-forget `pollAndDownloadVideo()`** polls every 10s (≤15 min) in-process and downloads the mp4 when done. The client can also force a check via `POST /api/generate/generations/:id/poll`. This background task is why the backend needs a long-running server (see below).

Reference images: uploaded via multer to `UPLOADS_DIR`, then inlined as base64 data URLs — as `input_references` for image-to-image, or `frame_images` (`first_frame`) for image-to-video. No separate upload endpoint.

**Persistence:** every generation is one `generations` row (schema + migrations inline in `db/database.js`), tracked through `status` (`pending`→`in_progress`→`completed`/`failed`). `asset_path` is a **comma-separated** list of filenames served by `GET /api/assets/:file`; routes split it into `asset_urls`. All rows are scoped by `user_id` — history and detail queries always filter on the JWT's user.

**Model lists** are fetched from OpenRouter and cached in-process for 1 hour (`openrouter.js`), keyed by image vs video.

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

## Deployment split (important)

The backend **cannot run on Vercel** — it uses `better-sqlite3` (native addon + on-disk file), writes assets/uploads/DB under `data/` (needs a persistent volume), and runs the post-response background poll. Deploy the backend as a container (Render/Railway/Fly/VPS) with `/app/data` mounted, deploy the frontend static bundle to Vercel, and point `vercel.json`'s `/api` rewrite at the backend's public URL (currently a `REPLACE_WITH_YOUR_BACKEND_HOST` placeholder). See `DEPLOY.md`.

## Environment variables

`OPENROUTER_API_KEY` (required — generation 500s without it), `JWT_SECRET` (defaults to an insecure dev value), `PORT` (3001), `DB_PATH`/`UPLOADS_DIR`/`ASSETS_DIR` (under `data/`), `CORS_ORIGIN` (comma-separated allowlist; unset = allow all, dev only), `APP_REFERER`/`APP_TITLE` (sent as OpenRouter `HTTP-Referer`/`X-Title`). Backend loads `.env` from the **repo root**, not `backend/`.
