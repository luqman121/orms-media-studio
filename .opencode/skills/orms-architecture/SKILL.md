---
name: orms-architecture
description: Load before any multi-package change to ORMS Media Studio. Enforces that the existing npm-workspaces + Prisma/PostgreSQL + JWT + Next.js 15 + BullMQ + R2 + OpenRouter architecture remains the foundation, that work continues on feat/complete-generative-studio, and that no disconnected replacement app, duplicate backend, or browser-side provider access is introduced. Use when planning a feature, adding a package, or deciding where new behavior belongs.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-architecture

## When to use
Before designing or touching anything that spans more than one package, before deciding
where a new feature lives (web / worker / packages/*), and before any structural change.
Always read `IMPLEMENTATION_PLAN.md` first.

## Files to inspect first
- `IMPLEMENTATION_PLAN.md` (authoritative handoff; §3 stack, §6 completed work, §9 remaining phases)
- `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`
- `package.json` (workspaces: `apps/*`, `packages/*`)
- `packages/db/prisma/schema.prisma`
- `apps/web/lib/auth.ts`, `apps/web/lib/http.ts`, `apps/web/lib/serialize.ts`, `apps/web/lib/storage.ts`, `apps/web/lib/queue.ts`, `apps/web/lib/videoPoll.ts`
- `packages/model-router/src/types.ts`, `packages/model-router/src/openrouter.ts`, `packages/model-router/src/credits.ts`
- `apps/worker/src/index.ts`, `apps/worker/src/processor.ts`

## Required workflow
1. Confirm you are on `feat/complete-generative-studio` and that commits `f3139cd` and `36ec947` are present.
2. Identify the first **incomplete** phase in `IMPLEMENTATION_PLAN.md` §9; do not re-do done work.
3. Decide where the change lives. Request flow is: browser → `apps/web/lib/api.ts` → same-origin `/api/*` route handlers → `@orms/db` (Prisma) + `@orms/model-router` / `@orms/openrouter` → OpenRouter.
4. New persistence = additive Prisma migration + camelCase→snake_case mapping in `serialize.ts`.
5. Fetch the latest state from code (code overrides stale docs); record any doc/code discrepancy.

## Invariants
- Stack is fixed: **npm workspaces**, Prisma + PostgreSQL, custom **JWT** (`lib/auth.ts`), Next.js 15 App Router, BullMQ worker, R2 via S3 SDK, OpenRouter only.
- No pnpm / yarn / Drizzle / Auth.js / OAuth in Increment 1.
- Provider secrets are **server-side only**; the browser never sees `OPENROUTER_API_KEY` or R2 keys.
- Single-tenant: every tenant-owned record carries `userId`; no workspaces.
- Increment 1 precedes Increment 2. Unsupported features stay **hidden** (feature-flagged off), never faked.
- Prefer complete vertical behavior over broad unfinished UI; no dead tabs, no mock data in production routes.

## Prohibited shortcuts
- Creating a disconnected replacement app or new starter template.
- A second/duplicate backend or a parallel generation system (extend the existing routes/worker).
- Sending provider secrets to the client.
- Skipping Phase 2b by jumping to UI-only work.
- Editing on `main` or merging the feature branch to `main`.

## Verification commands
```bash
git branch --show-current                                  # feat/complete-generative-studio
git log --oneline -3                                        # expect f3139cd, 36ec947
DATABASE_URL=postgresql://x:x@localhost:5432/x npx prisma validate --schema=packages/db/prisma/schema.prisma
npx prisma generate --schema=packages/db/prisma/schema.prisma
npm --workspace @orms/model-router run typecheck
```

## Evidence required before claiming completion
- Exact files changed and the package each belongs to.
- Confirmation the existing request flow is preserved (no new backend, no client-side provider calls).
- Citation of which `IMPLEMENTATION_PLAN.md` phase/checkbox the work satisfies.

## Definition of done
Change is grounded in the existing architecture, additive to it, scoped by `userId`, keeps secrets
server-side, and advances exactly one incomplete plan phase — verified by typecheck/build.