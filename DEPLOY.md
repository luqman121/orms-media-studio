# Deployment Guide — OpenRouter Media Studio

The app is now a **single Next.js 15 application** (`apps/web`) that serves the UI **and** the API from one origin. Deploy it as **one long-running container**.

| Part | Tech | Where it runs |
|------|------|---------------|
| `apps/web` | Next.js 15 (UI + API route handlers) | Container host (Render / Railway / Fly.io / VPS) with a persistent volume |

## Why not Vercel serverless (yet)

Vercel runs **stateless serverless functions**. The current app is still stateful and needs a long-running server:

1. **`node:sqlite`** — the DB is a file on local disk (`apps/web/lib/db.ts`).
2. **Local-disk assets** — uploads + generated images/videos are written under `data/` (`apps/web/lib/storage.ts`); a serverless filesystem is ephemeral and wiped between invocations.
3. **Background work** — video generation runs a ~15-minute `pollAndDownloadVideo()` *after* the HTTP response (`apps/web/lib/videoPoll.ts`); a serverless function is frozen the moment it responds.

Phases 3–5 of the migration (Postgres, R2 object storage, BullMQ queue) remove these constraints and make serverless viable. Until then, self-host.

> **Node 22+ is required** (the API uses the built-in `node:sqlite`). The `Dockerfile` uses `node:24`.

## Architecture

```
  Browser ──▶ Next.js container (UI + /api/* on one origin, no CORS)
                 │
                 ▼
            OpenRouter API (https://openrouter.ai/api/v1)
```

## Deploy the container

The repo ships a production `Dockerfile` (Next.js `standalone` output) and `docker-compose.yml`. Deploy to any host that runs containers with a **persistent volume mounted at `/app/data`**:

- **Render** → New ▸ Web Service ▸ "Deploy from a Dockerfile", add a Persistent Disk at `/app/data`.
- **Railway** → New ▸ Deploy from repo (uses the Dockerfile), add a Volume at `/app/data`.
- **Fly.io** → `fly launch` (detects the Dockerfile), `fly volumes create data`, mount at `/app/data`.

Set these environment variables:

| Variable | Value |
|----------|-------|
| `OPENROUTER_API_KEY` | your key from https://openrouter.ai/keys |
| `JWT_SECRET` | a long random hex string (**required in prod**) |
| `APP_REFERER` | your public URL, e.g. `https://your-app.onrender.com` |
| `APP_TITLE` | `OpenRouter Media Studio` |
| `DATA_DIR` | `/app/data` (DB + uploads + assets live here) |

The container listens on **:3000** (`PORT`, `HOSTNAME=0.0.0.0`).

## Local one-box deploy

```bash
export OPENROUTER_API_KEY=sk-or-v1-xxxx
export JWT_SECRET=$(openssl rand -hex 32)
docker compose up --build -d
# open http://localhost:3000
```

## Local development (no Docker)

```bash
npm install
JWT_SECRET=$(openssl rand -hex 32) OPENROUTER_API_KEY=sk-or-v1-xxxx npm run dev
# open http://localhost:3000
```
