---
name: orms-testing-ci
description: Load when adding or reviewing tests (Vitest unit, DB integration, Playwright e2e), CI workflows, provider mocks, migration/build verification, or any verification harness for ORMS. Enforces deterministic tests with mocked OpenRouter, PostgreSQL (and Redis where the worker path is exercised) CI services, no paid provider calls in CI, and clear verified-vs-unverified result reporting.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-testing-ci

## When to use
For Phase 5 (tests + CI) and whenever you add a test, mock, workflow, or verification step.

## Files to inspect first
- `IMPLEMENTATION_PLAN.md` §9 Phase 5, §14 (concrete required test cases), §19 (definition of done)
- `apps/web/lib/credits.ts`, `packages/model-router/src/openrouter.ts`, `packages/model-router/src/credits.ts`
- `packages/openrouter/src/index.ts` (the seam to mock)
- `apps/worker/src/processor.ts`, `apps/web/lib/videoPoll.ts`, `apps/web/lib/queue.ts`
- `packages/db/prisma/schema.prisma` (models under test)
- root `package.json` (no `test` script exists yet — Phase 5 adds it)

## Required workflow
1. Add **Vitest** for unit tests + **DB integration tests** against a real (disposable) Postgres.
2. Add **Playwright** e2e.
3. Add CI under `.github/workflows/` with a **PostgreSQL service** (and **Redis** when the worker
   path is exercised) and **provider mocks** (mock OpenRouter — never call paid providers in CI).
4. Validate migration application on a clean DB and the production build in CI.
5. Cover the concrete cases in `IMPLEMENTATION_PLAN.md` §14:
   project/asset ownership; signup grant + idempotency; reserve success + insufficient rejection;
   settlement (refund-difference + extra-charge, once); refund once; duplicate idempotency key;
   concurrent reservation (no overspend); successful mocked generation → Generation + Asset +
   ledger + RunEvents; failed generation → failure event + exactly-once reconciliation;
   RunEvent ordering (monotonic `seq`); SSE replay from `Last-Event-ID` + SSE authorization;
   refresh-surviving state; Arabic default + locale switching (dir flip); unauthorized API denied;
   mocked OpenRouter generation; production build passes.

## Invariants
- **No paid provider calls** in CI — OpenRouter is mocked.
- DB integration tests run against a disposable Postgres, never a production/shared DB.
- Redis CI service present only when the worker path is exercised.
- Results are reported as **verified** vs **unverified** (per `IMPLEMENTATION_PLAN.md` §7).
- Never run `prisma migrate reset` / `DROP DATABASE` / `docker compose down -v` in CI against
  persistent data; disposable DBs only for destructive test commands.

## Prohibited shortcuts
- Hitting real OpenRouter (or any paid provider) from a test.
- Running migrations/tests against a non-disposable database.
- Marking something "verified" without executing the test.

## Verification commands
```bash
# After Phase 5 tooling exists:
npm test
npm run build
# CI migrations on a clean service DB; provider mocks; build verification.
```

## Evidence required before claiming completion
- Passing runs for every §14 case (with logs/output).
- CI workflow file(s) using Postgres/Redis services and mocked providers.
- Explicit verified-vs-unverified separation matching §7.

## Definition of done
Vitest unit + DB integration tests, Playwright e2e, and CI (Postgres/Redis services, mocked
providers, no paid calls, migration + build verification) exist and pass, with results clearly
separated into verified vs unverified.