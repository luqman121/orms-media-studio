# Deployment Guide — OpenRouter Media Studio

This project has **two parts**:

| Part | Tech | Where it can run |
|------|------|------------------|
| `frontend/` | Vite + React static SPA | ✅ **Vercel** (or any static host) |
| `backend/`  | Express + **better-sqlite3** + local-disk storage + background jobs | ❌ **Not Vercel** — needs a long-running container |

## Why the backend cannot run on Vercel

Vercel runs **stateless serverless functions**, not long-lived servers. This backend is fundamentally stateful and therefore incompatible:

1. **Native module** — `better-sqlite3` is a compiled C++ addon backed by a real file on disk.
2. **Persistent local filesystem** — uploads, generated images, and the SQLite DB are written under `data/`. On Vercel the filesystem is **read-only** (except an ephemeral `/tmp`) and is **wiped between invocations**, so every user, asset, and history record would vanish on the next cold start.
3. **Background work** — video generation fires a 15-minute `pollAndDownloadVideo()` task *after* the HTTP response is sent (`backend/src/routes/generate.js`). A serverless function is frozen/killed the moment it responds, so the poll never finishes.
4. **`app.listen()`** — the backend opens a TCP port and runs continuously; Vercel expects an exported request handler instead.

> These are not bugs — the app is correctly written for a normal server. It just needs a server. **No backend or frontend source code was changed**; only deployment configuration was added.

## Recommended architecture

```
  Browser ──▶ Vercel (frontend static SPA)
                 │  /api/*  (rewrite proxy, see vercel.json)
                 ▼
            Backend container  (Render / Railway / Fly.io / VPS)
                 │
                 ▼
            OpenRouter API
```

---

## Step 1 — Deploy the backend (container host)

The repo already ships a production `Dockerfile` and `docker-compose.yml`. Deploy that image to any host that runs containers with a persistent volume:

- **Render** → New ▸ Web Service ▸ "Deploy from a Dockerfile", add a Persistent Disk mounted at `/app/data`.
- **Railway** → New ▸ Deploy from repo (uses the Dockerfile), add a Volume at `/app/data`.
- **Fly.io** → `fly launch` (detects the Dockerfile), `fly volumes create data`, mount at `/app/data`.

Set these environment variables on the backend service:

| Variable | Value |
|----------|-------|
| `OPENROUTER_API_KEY` | your key from https://openrouter.ai/keys |
| `JWT_SECRET` | a long random hex string |
| `APP_REFERER` | your Vercel URL, e.g. `https://your-app.vercel.app` |
| `APP_TITLE` | `OpenRouter Media Studio` |

Note the backend's **public URL** (e.g. `https://orms-backend.onrender.com`).

## Step 2 — Point the frontend at the backend

Open [`vercel.json`](./vercel.json) and replace the placeholder host in the `/api` rewrite:

```json
{ "source": "/api/:path*", "destination": "https://orms-backend.onrender.com/api/:path*" }
```

The frontend calls the backend with **relative `/api/...` URLs**, so this rewrite is all that is needed — no frontend code changes. Because requests now arrive same-origin (`/api` on the Vercel domain), CORS is a non-issue.

> SSE image streaming and binary video downloads pass straight through a Vercel rewrite, so live generation and downloads keep working.

## Step 3 — Deploy the frontend to Vercel

1. Import the GitHub repo into Vercel.
2. Vercel reads `vercel.json` automatically:
   - **Build:** `npm --prefix frontend ci && npm --prefix frontend run build`
   - **Output:** `frontend/dist`
   - **Routing:** SPA fallback to `/index.html` so deep links like `/history` work.
3. Deploy. (No env vars are required on Vercel itself — the backend holds the secrets.)

That's it. The Vercel domain serves the UI and transparently proxies `/api/*` to your backend.

---

## Alternative — one-box deploy (no Vercel)

If you prefer a single deployment, the existing Docker setup already serves the built frontend **and** the API from one container on port 3001:

```bash
export OPENROUTER_API_KEY=sk-or-v1-xxxx
export JWT_SECRET=$(openssl rand -hex 32)
docker compose up --build -d
# open http://localhost:3001
```

This is the simplest path if you don't specifically need Vercel.
