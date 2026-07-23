# ORMS Media Studio — Implementation Handoff (Increment 1)

> **Authoritative handoff for the next coding agent.** This file lives on `main`.
> The actual Increment 1 implementation lives on the branch
> **`feat/complete-generative-studio`** — it has **not** been merged into `main`.
> Read this whole document before writing any code.

---

## 1. Document purpose

This is the authoritative implementation handoff for **Increment 1** of the ORMS
"complete generative studio" program.

- ORMS Media Studio is an **existing, working application** — not a greenfield project.
- Work must continue **incrementally** on top of the current architecture.
- The existing architecture **must remain the foundation**. Do **not** create a
  disconnected replacement app or scaffold a new starter template.
- **Unsupported features must stay hidden** (feature-flagged off), never faked. No dead
  tabs, no fake buttons, no mock data in production routes.

---

## 2. Repository and branch state

| Item | Value |
|---|---|
| Repository | `luqman121/orms-media-studio` |
| Default branch | `main` (this handoff is committed here) |
| `main` HEAD when this plan was written | `e6ac556` — "Add explicit install/build/start commands to deploy.json" |
| Implementation branch | **`feat/complete-generative-studio`** |
| Implementation branch HEAD | `36ec947` (Phase 2a) → `9f9cb67` (skills config) |
| Working tree when plan generated | **clean** (confirmed via `git status`) |

> **Pre-implementation baseline (recorded before Phase 2b):**
> `npm run build` on `feat/complete-generative-studio` @ `9f9cb67` — **PASS**.
> Verified: Prisma Client generation, Next.js production compilation, TypeScript
> validation, static page generation, and production build finalization all passed.
> Non-blocking warnings observed (do **not** address unless required):
> 1. Prisma `package.json` config deprecated (→ `prisma.config.ts` eventually).
> 2. OpenTelemetry/Sentry dynamic-dependency bundling warnings (build still succeeded).
> 3. BullMQ dynamic-dependency warning via `apps/web/lib/queue.ts` →
>    `apps/web/app/api/generate/video/route.ts` — **VERIFIED (explorer)**: the web app only
>    `new Queue('video-poll').add(...)` (enqueue); the sole BullMQ `Worker` consumer is
>    `apps/worker/src/index.ts:45` on the same `'video-poll'` queue. No second queue
>    architecture. The warning is just BullMQ being bundled into the web route chunk.
> 4. `JWT_SECRET` missing at build → auth used an insecure dev fallback — treat as a
>    **required runtime/security config check**; never commit a real secret.
> Baseline is clean enough to begin Phase 2b.
>
> **Phase 2b security audit (orms-security, read-only) — PASS-WITH-FINDINGS.**
> No Critical/High issues. Cross-user denial verified sound on SSE, assets route,
> generation list/detail/delete, and signed serializer. Remediations applied:
> `Referrer-Policy: no-referrer` on the asset 307; positive-integer `id` guard on
> `/generations/[id]` GET+DELETE; defense-in-depth `userId` re-scoping on SSE status
> re-checks. Accepted limitations: (1) legacy `Generation.assetPath` exact-match
> fallback only matches single-key rows — the normalized `Asset` rows (Slices 1/2) are
> the authoritative ownership record for multi-asset generations; (2) a 5-min signed
> URL is a bearer token within its TTL — mitigated by the short TTL + no-referrer.
> Blocking gate from `orms-asset-security` definition of done: the required regression
> tests (unauth / wrong-user / missing / owner / traversal / SSE replay / cross-user SSE)
> are deferred to Phase 5 (no test runner installed yet). Runtime credit/SSE/provider/
> signing behavior is UNVERIFIED until then.

**Commits that contain the real Increment 1 work (on the feature branch, NOT on main):**

- [x] `f3139cd` — Phase 1: data-model + provider-router foundations
- [x] `36ec947` — Phase 2a: durable credit ledger + signup grant + credits API

**The next agent MUST continue from the feature branch. Do not re-implement from `main`.**

```bash
git fetch origin
git checkout feat/complete-generative-studio
git pull --ff-only origin feat/complete-generative-studio
```

Before writing any code, **confirm the two commits above are present**:

```bash
git log --oneline -3   # expect 36ec947 and f3139cd at/near HEAD
```

If they are absent, stop and investigate — do not start a duplicate implementation.

---

## 3. Confirmed technology stack (grounded in the current repo)

Verified by direct repository inspection — **not** assumptions:

- **Package manager:** **npm workspaces** (root `package.json` `"workspaces": ["apps/*","packages/*"]`).
  There is **no** pnpm, no yarn, and **no Turborepo** (no `turbo.json`). Node `>=22`.
- **ORM:** **Prisma** (`packages/db`, `prisma-client-js`). There is **no Drizzle**.
- **Database:** **PostgreSQL** (`datasource db { provider = "postgresql" }`, Neon in prod).
- **Auth:** **custom JWT** (`apps/web/lib/auth.ts`, `jsonwebtoken`, bcrypt password hashing,
  `Bearer` token, `requireAuth(req)`). There is **no Auth.js/NextAuth and no Google/OAuth**.
- **Web framework:** **Next.js 15 (App Router) + React 19**, Tailwind 3.4, TypeScript.
  `apps/web`. `output: 'standalone'`.
- **Worker:** `apps/worker` — a standalone **BullMQ** `Worker` on the `video-poll` queue plus
  a **Bull Board** admin UI (Express, port 4001), run via `tsx`. Communicates with the web app
  only through **shared Postgres + shared Redis (BullMQ)** and the `@orms/*` packages.
- **Storage:** **Cloudflare R2** via the AWS S3 SDK (`apps/web/lib/storage.ts`:
  `putObject`, `getSignedDownloadUrl`, `deleteObject`). Assets are served by
  `GET /api/assets/[filename]` as a **307 redirect to a short-lived signed R2 URL**.
- **Provider:** **OpenRouter only** (`packages/openrouter`). No MuAPI/Fal/Replicate/WaveSpeed/ComfyUI.
- **Tests:** **none** exist (no Vitest/Playwright/Jest, no `*.test.*`/`*.spec.*`).
- **CI:** **none** (there is no `.github/` directory).

Do not describe any pnpm/Drizzle/Auth.js/Google design as fact — the repo uses
**npm + Prisma + JWT**. Ground all work in the code that exists now.

---

## 4. Original program objective

Transform ORMS Media Studio into an **Arabic-first, production-ready AI image & video
generation platform**, while **preserving the current architecture** (npm workspaces,
Next.js `apps/web`, `apps/worker`, Prisma/Postgres, R2, OpenRouter, JWT).

Eventual target capabilities (across multiple increments):

- Image generation · Video generation · Image-to-video
- Asset Library · Projects · Generation history · Durable progress
- Credits (reserve/settle/refund) · Arabic + English (RTL/LTR)
- Provider abstraction → later **multi-provider** support
- Later: upstream studio integration, billing, administration

**Increment 1 is a single, self-contained vertical slice** (below). Everything else is a
**later increment** and must not be half-built or faked now.

---

## 5. Increment 1 scope (approved)

- Single-user architecture (records scoped by `userId`; **no workspaces/tenancy**).
- **OpenRouter-only** provider.
- Real PostgreSQL persistence via **additive Prisma migrations**.
- JWT authentication **retained** (no auth rewrite).
- Durable `Generation` records + durable `RunEvent`s.
- Credit **reserve / settle / refund** with a signup grant.
- **Refresh-surviving SSE** progress.
- **Asset authorization** (ownership-checked access).
- **Projects** + **Asset Library** (real, DB-backed).
- **Arabic-default** localization + **English** locale.
- **Capability-aware composer** (only show controls a model supports).
- **Vitest** + **Playwright** + **CI with mocked providers**.

---

## 6. Completed implementation (on `feat/complete-generative-studio`)

> Confirmed from `git diff --name-status main...feat/complete-generative-studio`.
> Do not mark anything else complete unless it exists on the feature branch.

### Phase 1 — data-model + provider-router foundations (`f3139cd`)  ✅

- [x] **Prisma schema** (`packages/db/prisma/schema.prisma`) — new models:
  - [x] `Project` (`@@map("projects")`) — `id, userId, name, archived, createdAt, updatedAt`.
  - [x] `Asset` (`@@map("assets")`) — `id, userId, generationId?, projectId?, kind,
        storageKey, mediaType, name?, sizeBytes?, width?, height?, durationMs?, favorite,
        createdAt`. Normalizes assets out of the denormalized `Generation.assetPath`.
  - [x] `RunEvent` (`@@map("run_events")`) — `id, generationId, userId, seq, type, dataJson?,
        createdAt`; unique `(generationId, seq)`. Append-only progress log for SSE replay.
  - [x] `CreditWallet` (`@@map("credit_wallets")`) — `id, userId @unique, balance, updatedAt`.
  - [x] `CreditLedger` (`@@map("credit_ledger")`) — `id, userId, kind, amount, balanceAfter,
        generationId?, reason?, idempotencyKey? @unique, createdAt`.
- [x] **`Generation` new columns:** `provider` (default `"openrouter"`), `idempotencyKey @unique`,
      `estimatedCredits?`, `reservedCredits?`, `finalCredits?`, `projectId?` (+ relations/indexes).
- [x] All new records are **`userId`-scoped** (single-tenant).
- [x] **Migration:** `packages/db/prisma/migrations/20260708120000_increment1_projects_credits_assets_run_events/migration.sql`
      (generated **offline** via `prisma migrate diff` — additive `ALTER TABLE` + `CREATE TABLE`
      + indexes + FKs; **not** applied to a live DB in this environment).
- [x] **Backfill script:** `scripts/backfill-increment1.ts` — idempotent; creates `Asset`
      rows from existing `Generation.assetPath` and grants `CreditWallet` + `signup` ledger to
      existing users. Run with `npx tsx scripts/backfill-increment1.ts` **after** migrating.
- [x] **New package `packages/model-router`** (`@orms/model-router`):
  - [x] `src/types.ts` — `MediaCapability`, `MediaType`, `ModelLimits`, `ModelPricing`,
        `ModelDefinition`, `NormalizedError`.
  - [x] `src/credits.ts` — integer credit economics: `SIGNUP_CREDITS` (env
        `CREDITS_SIGNUP_GRANT`, default 100), `CREDITS_PER_USD` (default 1000),
        `usdToCredits()`, `estimateCredits()` (env `CREDITS_ESTIMATE_IMAGE`=5 /
        `CREDITS_ESTIMATE_VIDEO`=50), `pricingUnit()`.
  - [x] `src/openrouter.ts` — OpenRouter adapter: `listImageModelDefinitions()`,
        `listVideoModelDefinitions()`, capability derivation from OpenRouter model shapes, and
        `normalizeError()` returning **user-safe Arabic** messages + retryability.
  - [x] `src/index.ts` — `listModelDefinitions()`, `findModelDefinition()` + re-exports.
  - [x] `tsconfig.json` — **`module: ESNext`, `moduleResolution: Bundler`** with
        **extensionless** relative imports (required so Next's webpack bundler resolves the
        multi-file package — do not switch back to NodeNext `.js` extensions).
- [x] **`apps/web` wiring:** `@orms/model-router` added to `apps/web/package.json` deps and to
      `transpilePackages` in `apps/web/next.config.ts`.
- [x] **`THIRD_PARTY_NOTICES.md`** — documents Open-Generative-AI (MIT); records that **no code
      has been ported yet** (functional porting deferred to the multi-provider phase).
- [x] **Legacy directory deletion** — removed the dead, unbuilt `frontend/` (Vite SPA, 16 files)
      and `backend/` (Express+SQLite, 10 files). See §15.

### Phase 2a — durable credit ledger (`36ec947`)  ✅

- [x] **`apps/web/lib/credits.ts`** — transactional, idempotency-keyed integer ledger:
  - [x] `getBalance(userId)`
  - [x] `grantSignupCredits(userId)` — idempotent (`idempotencyKey = signup:{userId}`).
  - [x] `reserveCredits(userId, amount, {generationId, idempotencyKey})` — throws
        `InsufficientCreditsError` (HTTP 402) when balance is short.
  - [x] `settleCredits(userId, {generationId, reservedCredits, finalCredits, idempotencyKey})`
        — reconciles reservation vs real cost (refund or extra charge; floors at 0).
  - [x] `refundCredits(userId, {generationId, amount, idempotencyKey, reason?})`.
  - [x] Internal `applyDelta()` runs inside `prisma.$transaction`, upserts the wallet, and
        writes the `CreditLedger` row; duplicate `idempotencyKey` short-circuits to the recorded
        `balanceAfter` (no double charge).
- [x] **Registration integration:** `apps/web/app/api/auth/register/route.ts` now calls
      `grantSignupCredits(user.id)` (idempotent, non-blocking — a grant failure logs but does not
      fail registration).
- [x] **Credits API:** `apps/web/app/api/users/me/credits/route.ts` (`GET`) returns
      `{ balance, ledger[] }`.

---

## 7. Verification already performed

**Verified locally (commands actually run and reported passing):**

- [x] `npx prisma validate --schema=packages/db/prisma/schema.prisma` (with a dummy
      `DATABASE_URL`) → "The schema … is valid".
- [x] `npx prisma generate` → Prisma Client generated successfully.
- [x] `npm --workspace @orms/model-router run typecheck` (`tsc --noEmit`) → passes.
- [x] `npm run build` (root → `prisma generate` + `next build` for `apps/web`) → **compiles
      successfully**; `/api/users/me/credits` appears in the route manifest.
- [x] `new PrismaClient()` constructs successfully after `prisma generate` (sanity check).

**NOT runtime-verified (must be proven later in CI / on a real deploy):**

- [ ] PostgreSQL **migration application** (the migration SQL has never been applied to a DB).
- [ ] **Credit transaction behavior**, concurrency, and idempotency at runtime.
- [ ] Backfill script execution against real data.
- [ ] Any end-to-end generation, SSE, or provider execution.

Do **not** claim any of the "NOT runtime-verified" items as proven.

---

## 8. Known environment constraints (in the session that produced Phases 1–2a)

- **Docker daemon:** DOWN (`docker info` failed) → `docker compose` could not be exercised.
- **PostgreSQL:** no server available (only the `psql` client) → no DB-integration or
  migration runs were possible locally.
- **Redis:** not available locally → BullMQ worker path not exercised.
- **Provider keys:** only **OpenRouter** is expected to be available (per the product owner);
  no MuAPI/Fal/Replicate/WaveSpeed/ComfyUI keys.
- **npm install:** intermittently unstable (repeated `ECONNRESET` on the large dependency tree);
  it did eventually complete and `node_modules` is present. Retry installs if they fail.

These limits affect **runtime verification only**. They do **not** excuse leaving code
unfinished — finish the implementation and add **deterministic CI tests** (mocked providers +
a Postgres service) so behavior is proven in CI.

---

## 9. Remaining implementation phases (execute in this order)

### Phase 2b — durable generation lifecycle  ⏳ (next)

Integrate into the **existing** routes/worker — do **not** build a parallel generation system.

**Success flow (server-authoritative):**

```
authenticate (requireAuth)
→ validate ownership (project/asset if referenced)
→ validate model capability via @orms/model-router
→ compute server-side credit estimate (never trust the client)
→ create or resolve Generation by idempotencyKey
→ reserveCredits() transactionally
→ persist RunEvent (created/queued/...)
→ submit provider work through the EXISTING path
   (packages/openrouter + apps/web/lib/queue.ts / apps/web/lib/videoPoll.ts / apps/worker)
→ persist provider status (Generation.status/jobId/pollingUrl)
→ process result
→ write Asset record(s)
→ settleCredits() once
→ persist terminal RunEvent (completed)
```

**Failure flow:**

```
normalize error (model-router normalizeError → Arabic message)
→ persist failure RunEvent
→ refund/reconcile credits exactly once (idempotency-keyed)
→ classify retryability
→ return a safe Arabic error (lib/http handleError)
```

- [x] Wire the above into `apps/web/app/api/generate/image/route.ts` (sync path; SSE stream path remains upstream-proxy and is a future slice) — done in `420e5b8`.
- [x] Wire into `apps/web/app/api/generate/video/route.ts`, `apps/worker/src/processor.ts`,
      and the in-process fallback `apps/web/lib/videoPoll.ts` (both must write identical `RunEvent`s) — done in `420e5b8`; worker + poller emit identical event sequences.
- [x] Persist `RunEvent`s with a **monotonic `seq`** per generation — `@orms/generation-runtime` `appendRunEvent` (max+1 transactional + P2002 retry).

**Durable SSE endpoint** (new, e.g. `GET /api/generate/generations/[id]/events`):

- [x] Authenticate (`requireAuth`) and verify **generation ownership** — `findFirst({ where: { id, userId } })`.
- [x] Source events from the **persisted `RunEvent` table** (not an in-memory emitter only) — DB polling (1s), no Redis/in-memory emitter.
- [x] **Ordered replay** from `Last-Event-ID`; heartbeats (15s); supports reconnection — SSE `id` is `RunEvent.seq`.
- [x] Close on terminal state. **No cross-user leaks.** Survives a page refresh.

**Asset route security** (fix `GET /api/assets/[filename]`, currently unauthenticated):

- [x] Require authentication **and** verify the caller **owns** the `Asset`/`Generation` — `requireAuth` + `findFirst({ storageKey, userId })` + legacy `Generation.assetPath` fallback.
- [x] Do **not** authorize based on the object key alone (keys are guessable today) — ownership DB lookup precedes any signing.
- [x] Keep storage **private**; issue **short-lived signed** access or safely proxy — 300s signed R2 URLs via `getSignedDownloadUrl`; bucket stays private; `Referrer-Policy: no-referrer` on the 307.
- [x] Note: `<img>`/`<video>` tags cannot send a `Bearer` header — use a signed/tokenized URL
      minted by an authenticated endpoint (or a same-origin authenticated proxy). Design for this.
- [ ] Tests for **unauthenticated**, **wrong-user**, **missing**, and **owner** access.

### Phase 3 — localization  ⏳ (slices 1–3 implemented & build-verified; NOT yet quality-gated)

- [x] Add **next-intl** (no equivalent i18n exists today). **Arabic default**, **English** support.
- [x] **Cookie-based** locale preference (next-intl "without i18n routing"; no `app/[locale]`
      restructuring); compute `dir` from locale. Cookie `NEXT_LOCALE`, default `ar`, supports `["ar","en"]`.
- [x] Locale switcher (in `apps/web/components/DashboardShell.tsx`) → `POST /api/locale`
      (same-origin CSRF guard) + `router.refresh()`.
- [x] Centralized message catalogs `apps/web/messages/{ar,en}.json` (366 keys each, no missing
      translations, no duplicates). All customer-facing page strings migrated
      (generate/dashboard/history/settings/auth + landing navbar/hero/sections/pricing/faq/footer/finalCta).
- [x] Localized user-facing errors — server-side. Library packages (`@orms/model-router`,
      `@orms/generation-runtime`) emit stable machine `code` strings + `retryable` flags
      (**locale-agnostic** — no next-intl, no cookies — so the BullMQ worker shares them
      verbatim). `apps/web/lib/http.ts` `handleError` is the single translation boundary;
      it resolves the request locale via `getLocale`/`getTranslations` and maps by `code`
      (`AuthError.code`, `InsufficientCreditsError.code`, `LocalizedError.code`, duck-typed
      `NormalizedError.code`). Arabic fallback messages remain in libraries as fallback-only.
      API routes use `messages/errors.*` for every HTTP response `error`/`message` field.
- [ ] Verify **RTL and LTR** on tabs/sliders/dialogs. (Logical Tailwind classes converted in
      migrated page files; runtime visual verification deferred to Phase 5 Playwright.)

> **Phase 3 known limitation — `Generation.error` Arabic-in-DB (documented, not hidden):**
> The worker (`apps/worker/src/processor.ts`, untouchable this phase) writes Arabic
> `messageAr` into the persisted `Generation.error` column; the web routes mirror this to
> keep **identical RunEvent** behavior. The HTTP **response** `error` field for these same
> cases IS localized via `errors.credits.insufficient` / `errors.provider.*`. Fully
> localizing the read path (`serializeGeneration` returns `g.error`) would require a schema
> `error_code` column + worker coordination + serialization logic changes — out of scope.
> A future slice should add an `error_code` column, have the worker write the stable `code`,
> and have `serializeGeneration` translate at read time.

> **Phase 3 runtime verification status — PARTIALLY VERIFIED** (combined Phase 2b + Phase 3
> quality gate run on a disposable local Postgres + Redis; no paid provider call).
> **Runtime-verified (curl against `next start`):**
> - Locale-aware API error responses: no cookie → Arabic; `NEXT_LOCALE=en` → English;
>   `NEXT_LOCALE=fr` (invalid) → Arabic fallback. Same `code` returns in EN + AR for
>   `generate.modelRequired`.
> - `<html lang dir>` flips: no cookie → `lang="ar" dir="rtl"`; `en` → `lang="en" dir="ltr"`;
>   `fr` → fallback `ar/rtl`. Cookie persists across a follow-up GET `/`.
> - `/api/locale` validation + SameSite/HttpOnly cookie + same-origin CSRF guard: valid
>   ar/en → 200 + cookie; invalid `fr` → 400 `invalid_locale`; cross-origin `evil.com` →
>   403 `forbidden`; non-JSON body → 400 `invalid_body`.
> - Unauthenticated SSE → 401; unauthenticated asset → 401; unauthenticated generation
>   detail → 401.
> - Cross-user SSE → 404 with no events streamed; cross-user asset → 404 (no existence
>   leak); cross-user generation detail → 404.
> - Owner asset → 307 to a 300s short-lived signed R2 URL carrying
>   `Referrer-Policy: no-referrer`; path-traversal `..%2F..%2Fetc%2Fpasswd` → basename → 404.
> - SSE replay: full → seqs 1-5 in order then close; `Last-Event-ID: 3` → seqs 4-5 only;
>   `Last-Event-ID: 5` (past terminal) → empty + close.
> - Positive-integer id guard on `/generations/[id]/poll` and `/generations/[id]`: `abc` →
>   404 (not 500).
> - Signup credit grant idempotency: duplicate `signup:{userId}` ledger insert blocked by
>   the unique constraint (`credit_ledger_idempotency_key_key`).
>
> **Combined gate reviewed (orms-reviewer + orms-security + orms-tests + orms-frontend,
> read-only) and findings remediated:**
> - HIGH credit concurrency overspend → fixed by `SELECT … FOR UPDATE` row lock in
>   `applyDelta` (`packages/generation-runtime/src/credits.ts`).
> - HIGH `stream=true` image path credit bypass (free-generation vector) → fixed by
>   hoisting the durable reserve→submit→settle/refund lifecycle above the `wantStream`
>   branch and passing reconcile context into `streamImage` (settle on `completed`,
>   refund on `error`/upstream-!ok/stream-without-terminal; stable codes persisted,
>   no raw internal text to the client).
> - Medium SSE initial-connect terminal race → fixed by re-draining in the initial
>   terminal branch (mirrors the tail loop).
> - Medium raw internal/provider error text leaked via `detail` → dropped from image +
>   video outer catches; `/poll` provider-failure path now throws a `LocalizedError`
>   (`generic.serverError`) instead of returning `(e).message`; `Generation.error` on
>   uncaught paths now stores a stable code, not the raw SDK message.
> - Medium `/generations/[id]/poll` missing positive-integer id guard → added.
> - Medium `DashboardShell.tsx` physical directional classes breaking LTR (`border-l`,
>   `right-0`, `text-right`) → converted to `border-e`, `start-0`, `text-end`.
>
> **STILL RUNTIME-UNVERIFIED — deferred to Phase 5 deterministic tests (no test runner
> installed):**
> - Concurrent overspend under true parallel `reserveCredits` against a real Postgres
>   (the `FOR UPDATE` fix is type/build-verified + reads correctly, but the
>   race window itself requires a Vitest + real-DB concurrency test, not a curl
>   spot-check). The static guarantee is the row lock; the dynamic proof is Phase 5.
> - Exactly-once settle/refund across simulated mid-flow crash/retry (recover-key vs
>   settle-key distinctness — needs an integration test with a mocked OpenRouter).
> - `stream=true` end-to-end settle/refund against a mocked streaming provider (needs the
>   Phase 5 mocked OpenRouter seam; curl can't reproduce this without paid calls).
> - LTR visual rendering at 375/768/1024/1440, reduced-motion, focus rings, mixed Arabic/
>   English bidi rendering — needs Playwright e2e (Phase 5).
> - Migration application on a clean DB: `prisma migrate deploy` failed because the
>   pre-existing `0_init` migration has a UTF-8 BOM that Postgres rejects (`\uFEFF` syntax
>   error at position 0). Per AGENTS.md (editing committed migrations is prohibited),
>   the disposable DB was set up via `prisma db push` (schema syncs cleanly — proves the
>   schema is valid on a fresh PG). Fixing the BOM in `0_init` is out of scope for this
>   gate and remains a known blocker for `prisma migrate deploy`-based CI (Phase 5
>   test-setup will need to either strip the BOM with a tiny migration-rename or use
>   `prisma db push` in CI).
>
> **Phase 3 is still NOT claimed fully quality-gated** — runtime checks pass for the
> surface exercised here, but the Phase 5 deterministic suite (Vitest + Playwright + CI)
> is the authoritative gate per `orms-asset-security`'s definition of done.

### Phase 4 — Projects, Asset Library, and composer  ⏳

Real, DB-backed (no production mock data, no dead controls):

- [ ] Projects: create / list / rename / open (routes + UI under `app/(dashboard)/`).
- [ ] Asset Library: list / preview / favorite / rename / delete / filter / search / paginate,
      backed by the new `Asset` table, with **secured** asset access.
- [ ] Generation history + details; **prompt reuse**; **retry** when allowed.
- [ ] Composer: **remaining-credit display**, **server-authoritative credit estimate**, and
      **capability-aware** model controls (hide controls the selected model does not support).
- [ ] Only expose capabilities OpenRouter actually supports in Increment 1.

### Phase 5 — tests and CI  ⏳

- [ ] **Vitest** unit tests + **DB integration tests**.
- [ ] **Playwright** e2e.
- [ ] **CI** (`.github/workflows/`) with a **PostgreSQL service** (and **Redis** if the worker
      path is exercised), **provider mocks**, migration application, and build verification.
- [ ] **No paid provider calls** in CI.

---

## 10. Credit invariants (must hold and be tested)

- [ ] Wallet balance can never go **negative** (`applyDelta` floors at 0; reserve rejects shortfalls).
- [ ] A reservation **cannot exceed** the available balance.
- [ ] Duplicate **idempotency keys cannot double-reserve** (unique key short-circuit).
- [ ] **Settlement happens once** per generation.
- [ ] **Refund happens once** per generation.
- [ ] A **settled reservation cannot be reused** to grant free work.
- [ ] **Concurrent requests cannot overspend** (transactional wallet update; needs a real-DB
      concurrency test — consider `SELECT … FOR UPDATE`/serializable if a gap is found).
- [ ] Ledger entries are **immutable** (append-only; never update/delete rows).
- [ ] **Signup grant is idempotent**.

Reference implementation: `apps/web/lib/credits.ts` (`reserveCredits`, `settleCredits`,
`refundCredits`, `grantSignupCredits`, `applyDelta`) and `packages/model-router/src/credits.ts`.

---

## 11. Database & migration requirements

- [ ] **Additive** Prisma migrations only. **Never** run `prisma migrate reset` on a
      non-disposable database, and no destructive drops of existing tables/columns.
- [ ] Safe, **idempotent** backfills (see `scripts/backfill-increment1.ts`).
- [ ] Preserve **existing-data compatibility** (keep `Generation.assetPath` + `serialize.ts`
      working while also writing normalized `Asset` rows).
- [ ] Appropriate **indexes** and **uniqueness** constraints (already added for the new tables).
- [ ] **Transactional** credit operations; every tenant-owned record carries `userId`.
- [ ] Test migrations on a **clean database**; test existing-data migration where possible.
- [ ] The existing baseline migration is `packages/db/prisma/migrations/0_init`; the new one is
      `…/20260708120000_increment1_projects_credits_assets_run_events`.

---

## 12. Provider-router requirements

Current seam: `packages/model-router` wraps `packages/openrouter`. Extend without rewriting UI.

- [ ] Provider **secrets stay server-side** (never sent to the browser).
- [ ] **Typed** internal model metadata (`ModelDefinition`), **server-side** capability
      validation, and **server-side** credit estimation.
- [ ] **Error normalization** (`normalizeError`) with Arabic user messages + retryability.
- [ ] Add **timeouts** and retryability classification on provider calls.
- [ ] Future adapters (MuAPI/Fal/Replicate/WaveSpeed/ComfyUI) must slot into the same
      `ModelDefinition`/adapter shape **without** changing the UI.
- [ ] **Multi-provider is NOT part of Increment 1** — OpenRouter only.

---

## 13. Security requirements

- [ ] JWT auth retained (`requireAuth`); every by-id route scoped `where: { id, userId }`.
- [ ] Ownership validation for projects, assets, generations, and the SSE stream.
- [ ] **Private** asset storage + **signed**, short-lived access (fix the open assets route).
- [ ] **No provider keys in the client.**
- [ ] Input validation; **upload validation** (MIME/signature/size — `MAX_UPLOAD_BYTES` = 50 MB
      in `apps/web/lib/http.ts`).
- [ ] **Rate limiting** where applicable (`apps/web/lib/ratelimit.ts`, Upstash; no-op when unset).
- [ ] **SSRF-safe** provider-output retrieval (server-side only; add allowlist + max size + timeout).
- [ ] Safe logging (no secrets, no full sensitive prompts); user-safe Arabic errors.
- [ ] **Idempotency keys** on generation submit + all credit mutations.
- [ ] Webhook signature verification — later, when billing is added.

---

## 14. Required tests (concrete cases)

- [ ] Project ownership (owner vs wrong-user).
- [ ] Asset ownership (owner / wrong-user / missing / unauthenticated).
- [ ] Signup credit grant (and its idempotency).
- [ ] Reservation (success + insufficient-balance rejection).
- [ ] Settlement (refund-difference + extra-charge cases; once only).
- [ ] Refund (once only).
- [ ] Duplicate idempotency key (no double effect).
- [ ] Concurrent reservation (no overspend).
- [ ] Successful generation (mocked OpenRouter) → Generation + Asset + ledger + RunEvents.
- [ ] Failed generation → failure event + exactly-once credit reconciliation.
- [ ] RunEvent ordering (monotonic `seq`).
- [ ] SSE replay (from `Last-Event-ID`) and SSE authorization (no cross-user).
- [ ] Refresh-surviving state.
- [ ] Arabic default locale + locale switching (dir flip).
- [ ] Unauthorized API access is rejected.
- [ ] Mocked OpenRouter generation (no paid calls).
- [ ] Production build passes.

---

## 15. Legacy directory deletion audit

Phase 1 (`f3139cd`) **deleted** the following dead directories (confirmed in the diff):

- `frontend/` — legacy **Vite + React (JSX)** SPA (`index.html`, `vite.config.js`,
  `src/**`, `tailwind.config.js`, `postcss.config.js`, checked-in `dist/`). 16 files.
- `backend/` — legacy **Express + SQLite** API (`src/index.js`, `routes/*`, `middleware/auth.js`,
  `services/openrouter.js`, `db/database.js`). 10 files.

Evidence they were **dead/unused** at deletion time:
- They are **not** npm workspaces (root globs are only `apps/*`, `packages/*`).
- Neither `Dockerfile` nor `Dockerfile.worker` copies them; `docker-compose.yml` / `deploy.json`
  do not reference them.
- The live code only mentions them in **comments** ("Ported from backend/…", "Ported from
  frontend/…"); nothing imports or builds them.

The next agent **must re-verify** the deletion is safe against, at minimum:
package scripts · imports · TS path aliases (`@/*` → `apps/web`) · `Dockerfile`/`Dockerfile.worker`
· `docker-compose.yml` · CI · `deploy.json` · runtime entry points · current docs.
If any evidence shows they were active, **restore them from Git** (`git checkout <ref> -- frontend backend`)
before continuing.

---

## 16. Deferred scope — must NOT be faked in Increment 1

Keep these **hidden behind feature flags** until actually implemented (no dead tabs/buttons):

- [ ] MuAPI-bound upstream studios (Open-Generative-AI `packages/studio`).
- [ ] Lip sync · Upscale · Advanced image editing.
- [ ] Stripe billing.
- [ ] Workspaces / multi-tenancy.
- [ ] OAuth / Google sign-in.
- [ ] Admin dashboard.
- [ ] Full multi-provider routing.
- [ ] Full upstream Open-Generative-AI UI integration.

---

## 17. Future Increment 2 direction (non-binding)

- Re-assess **Open-Generative-AI**; verify its exact commit hash and MIT license again.
- **Port** compatible studio code (JS→TS, re-skin to ORMS tokens) — do **not** copy branding.
- Connect studios to **ORMS internal APIs** (never call providers from the browser).
- Add **image + video provider adapters** (MuAPI/Fal/Replicate/WaveSpeed/ComfyUI) behind flags.
- Keep secrets **server-side**; preserve the ORMS design system and Arabic RTL.
- Add a **multi-provider model catalog**; expand real long-running worker jobs.
- **Do not begin Increment 2 until Increment 1 is fully verified.**

---

## 18. Agent execution rules

- Read this plan first.
- Inspect the current **branch and code** before editing; trust **code over docs** when they conflict.
- Continue from **`feat/complete-generative-studio`**; do not duplicate completed work.
- Keep this plan updated as work completes — use the **checkboxes** and record **commit hashes**.
- Commit in meaningful phases.
- **Do not merge to `main`** without explicit permission. **Do not deploy** without explicit permission.
- **Do not claim runtime verification that did not occur.**
- Do not stop after writing another plan — implement.
- Prefer **complete vertical behavior** over broad, unfinished UI.

---

## 19. Definition of Done — Increment 1

- [ ] Durable generation persistence (Generation + RunEvents).
- [ ] Correct credit lifecycle (reserve → settle/refund, exactly once).
- [ ] Refresh-surviving SSE progress.
- [ ] Asset ownership protection (secured `/api/assets`).
- [ ] Real Projects.
- [ ] Real Asset Library.
- [ ] Arabic default + RTL.
- [ ] English locale (switchable).
- [ ] Capability-aware OpenRouter composer.
- [ ] Unit tests (Vitest).
- [ ] Integration tests (DB + mocked providers).
- [ ] Playwright e2e.
- [ ] CI (Postgres service, provider mocks, no paid calls).
- [ ] Successful `npm run build`.
- [ ] Clean migrations (apply on a fresh DB).
- [ ] Clear evidence separating **verified** vs **unverified** behavior.

---

## 20. Final handoff checklist for the next agent

```bash
git fetch origin
git checkout feat/complete-generative-studio
git pull --ff-only origin feat/complete-generative-studio
git status
git log --oneline --decorate -20      # confirm 36ec947 and f3139cd are present

npm install                            # retry if ECONNRESET; node_modules may already exist
npx prisma validate --schema=packages/db/prisma/schema.prisma   # needs DATABASE_URL set
npx prisma generate --schema=packages/db/prisma/schema.prisma
npm run build
```

**Inspect the actual package scripts before running any test commands** — there is currently
**no `test` script** (root scripts: `dev, build, start, lint, generate, migrate, migrate:deploy,
worker:dev, db:seed-from-sqlite, icons, postinstall`; `apps/web`: `dev, build, start, lint`;
`@orms/model-router`: `typecheck`). Phase 5 adds the test tooling and scripts.

To apply the DB changes against a real Postgres (once `DATABASE_URL` is set):

```bash
npm run migrate:deploy                 # apply committed migrations
npx tsx scripts/backfill-increment1.ts # idempotent asset + wallet backfill
```

---

_This handoff reflects the repository state at `main` = `e6ac556` and
`feat/complete-generative-studio` = `36ec947`. The implementation is **not** merged into `main`._
