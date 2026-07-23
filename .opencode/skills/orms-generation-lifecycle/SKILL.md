---
name: orms-generation-lifecycle
description: Load when implementing, modifying, or reviewing the generation pipeline (image sync/SSE and video async) in apps/web/app/api/generate/*, apps/worker/src/processor.ts, apps/web/lib/queue.ts, apps/web/lib/videoPoll.ts, or RunEvents/SSE handling. Enforces the server-authoritative success/failure flow, durable RunEvents with monotonic seq, durable refresh-surviving SSE, and exactly-once credit settle/refund.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-generation-lifecycle

## When to use
When wiring the durable generation lifecycle (Phase 2b of `IMPLEMENTATION_PLAN.md`),
modifying `generate/image`, `generate/video`, the worker, the in-process poller, or the
durable SSE endpoint, and when reviewing those changes.

## Files to inspect first
- `IMPLEMENTATION_PLAN.md` §9 (Phase 2b), §10 (credit invariants), §14 (required tests)
- `apps/web/app/api/generate/image/route.ts` (sync + SSE paths)
- `apps/web/app/api/generate/video/route.ts`, `apps/web/lib/queue.ts`, `apps/web/lib/videoPoll.ts`
- `apps/worker/src/processor.ts`, `apps/worker/src/storage.ts`
- `apps/web/lib/credits.ts`, `apps/web/lib/http.ts`, `apps/web/lib/serialize.ts`
- `packages/model-router/src/openrouter.ts`, `packages/model-router/src/credits.ts`
- `packages/db/prisma/schema.prisma` — `Generation`, `RunEvent`, `Asset`, `CreditLedger`, `CreditWallet`

## Required workflow — success flow (server-authoritative)
```
authenticate (requireAuth)
→ validate ownership (project/asset if referenced) — where: { id, userId }
→ validate model capability via @orms/model-router (server-side)
→ compute server-side credit estimate (never trust the client)
→ create or resolve Generation by idempotencyKey
→ reserveCredits() transactionally
→ persist RunEvent (created/queued/...) with monotonic seq
→ submit provider work through the EXISTING path
   (packages/openrouter + apps/web/lib/queue.ts / apps/web/lib/videoPoll.ts / apps/worker)
→ persist provider status (Generation.status/jobId/pollingUrl)
→ process result
→ write Asset record(s) (normalized Asset rows; keep Generation.assetPath + serialize.ts working)
→ settleCredits() exactly once
→ persist terminal RunEvent (completed)
```
## Required workflow — failure flow
```
normalize error (model-router normalizeError → Arabic user message + retryability)
→ persist failure RunEvent
→ refund/reconcile credits exactly once (idempotency-keyed)
→ classify retryability
→ return a safe Arabic error (lib/http handleError)
```
## Durable SSE endpoint (new, e.g. GET /api/generate/generations/[id]/events)
- Authenticate (`requireAuth`) and verify **generation ownership**.
- Source events from the **persisted `RunEvent` table**, not an in-memory emitter only.
- Ordered replay from `Last-Event-ID`; heartbeats; supports reconnection; survives a page refresh.
- Close on terminal state. **No cross-user leaks.**

Both the BullMQ worker path (`apps/worker/src/processor.ts`) and the in-process fallback
(`apps/web/lib/videoPoll.ts`) must write **identical** `RunEvent`s.

## Invariants
- RunEvent `seq` is **monotonic per generation**; unique `(generationId, seq)`.
- Credits reserved before provider submit; settled or refunded **exactly once** per generation.
- `<img>`/`<video>` tags cannot send a `Bearer` header — use signed/tokenized URLs minted by an
  authenticated endpoint, or a same-origin authenticated proxy (see `orms-asset-security`).
- SSE stream is owned by the JWT user; never stream another user's events.
- Generation rows are scoped `where: { id, userId }`.

## Prohibited shortcuts
- Trusting client-supplied cost estimates or capability claims.
- Persisting events only in memory (must be durable rows).
- Settling/refunding more than once, or skipping refund on failure.
- Exposing another user's generation via the events stream.

## Verification commands
```bash
npm --workspace @orms/model-router run typecheck
DATABASE_URL=… npx prisma validate --schema=packages/db/prisma/schema.prisma
npm run build
# deterministic tests (Phase 5): mocked OpenRouter; verify Generation + Asset + ledger + RunEvents
```

## Evidence required before claiming completion
- Generation + RunEvents + Asset rows created for a mocked successful run.
- Failure run produces a failure event + exactly-once credit reconciliation.
- SSE replay from `Last-Event-ID` works and rejects wrong-user/missing/unauthenticated access.
- State survives a simulated refresh.

## Definition of done
The success and failure flows above are fully wired into existing routes/worker (no parallel
system), persisted to durable rows, credits settled/refunded exactly once, and SSE is replayable
and ownership-scoped — with deterministic tests proving each.