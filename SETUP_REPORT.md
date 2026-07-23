# ORMS Media Studio — OpenCode Setup Report

> Setup-only task. No Increment 1 features were implemented. No application code changed.
> Active branch: `feat/complete-generative-studio`.

---

## Repository

| Item | Value |
|---|---|
| Repository | `luqman121/orms-media-studio` |
| Branch (active) | `feat/complete-generative-studio` |
| Feature HEAD | `36ec947` |
| Parent (Phase 1) | `f3139cd` |
| Working tree before setup commit | untracked setup files only (no app/source diffs) |
| Required commits confirmed | ✅ `f3139cd` (Phase 1) and ✅ `36ec947` (Phase 2a) present |
| `IMPLEMENTATION_PLAN.md` | Retrieved from `origin/main` (commit `c4a2a76`) via `git checkout origin/main -- IMPLEMENTATION_PLAN.md` because the plan handoff lives on `main` and was absent on the feature branch. No `main` merge was performed. The file is staged as a new file (`A`). |
| `AGENTS.md` | Created (none existed). |

---

## Environment

| Item | Value |
|---|---|
| OS | Ubuntu 26.04 LTS (Resolute Raccoon) — kernel 7.0.0-28-generic x86_64 |
| OpenCode | 1.18.4 (`/home/luqman/.opencode/bin/opencode`) |
| Node | v24.18.0 (satisfies `engines.node >=22`; no `.nvmrc`/`.node-version`/`.tool-versions` present) |
| npm | 11.16.0 |
| npx | 11.16.0 |
| Python | 3.14.4 |
| Docker | 29.6.2 (daemon **running**; storage overlayfs) |
| Docker Compose | v5.3.1 |
| `psql` / `pg_isready` client | **Not installed** on host (the compose `db`/`redis` services are also not port-exposed to the host, so host-side `psql` is not required for setup) |

---

## Dependencies

| Item | Result |
|---|---|
| `npm ci` | ✅ succeeded — 548 packages added, audited 554 in ~30s. 29 vulnerabilities reported (1 low / 22 moderate / 6 high); no `--force`/`--legacy-peer-deps` used. |
| postinstall (Prisma generate) | Suppressed by npm `allow-scripts`; **not auto-run**. Run manually below. |
| `npm approve-scripts` | Not run during setup (would require installing scripts for 7 packages incl. `prisma`, `sharp`, `sentry/cli`); left for the user to review. Prisma generate was invoked explicitly instead. |
| Prisma validate | ✅ `DATABASE_URL=…dummy… npx prisma validate --schema=packages/db/prisma/schema.prisma` → schema valid. |
| Prisma generate | ✅ `npx prisma generate --schema=packages/db/prisma/schema.prisma` → Prisma Client v6.19.3 generated. |
| `@orms/model-router` typecheck | ✅ `tsc --noEmit` passes (exit 0). |
| `npm run build` | **Not run** during setup (heavy; already historically verified per plan §7). Available as `npm run build` when needed. |
| Unresolved dependency issue | None. |

---

## Services

| Service | Status |
|---|---|
| Docker daemon | running |
| PostgreSQL (`db`, `postgres:16-alpine`, container `orms-db`) | ✅ up & **healthy** (`docker compose up -d db redis`). **No host port mapping** — reachable only on the compose network (project design). |
| Redis (`redis`, `redis:7-alpine`, container `orms-redis`) | ✅ up & **healthy**. **No host port mapping** (compose network only). |
| Prisma validation/generation | ✅ works with a dummy `DATABASE_URL`. |
| Migration application | **Not run** (no port-exposed DB; non-production DB not explicitly confirmed for migration). Available via `npm run migrate:deploy` after setting `DATABASE_URL` to a reachable Postgres. |

> Note: because compose `db`/`redis` are not exposed to `localhost:5432`/`6379`, local
> `npm run dev` outside Docker needs either running the app in compose or adding host port
> mappings. This is a pre-existing project configuration choice and was **not** changed during setup.

---

## Skills

### General engineering skills (14, from `addyosmani/agent-skills`, MIT)

Source repo: https://github.com/addyosmani/agent-skills · Source commit: `fefc4075ddfd8363d3b2aa8b26e6440f1ce204c0` (2026-07-21) · License: **MIT**.
Installation method: inspected the shallow clone (`/tmp/orms-agent-skills`), then copied only the selected
`skills/<name>/SKILL.md` directories into the OpenCode-native path `.opencode/skills/`. The `skills` CLI
(npm `skills` v1.5.20) was verified to work, but manual copy was used for exact placement and a recorded
source commit. The temp clone was removed after copy.

Requested name mapping: all 14 requested names matched upstream directories exactly — no renames needed.

| # | Skill name | License |
|---|---|---|
| 1 | incremental-implementation | MIT |
| 2 | test-driven-development | MIT |
| 3 | api-and-interface-design | MIT |
| 4 | debugging-and-error-recovery | MIT |
| 5 | security-and-hardening | MIT |
| 6 | code-review-and-quality | MIT |
| 7 | frontend-ui-engineering | MIT |
| 8 | performance-optimization | MIT |
| 9 | ci-cd-and-automation | MIT |
| 10 | observability-and-instrumentation | MIT |
| 11 | git-workflow-and-versioning | MIT |
| 12 | source-driven-development | MIT |
| 13 | deprecation-and-migration | MIT |
| 14 | documentation-and-adrs | MIT |

### ORMS-specific skills (10, proprietary project instructions)

All created at `.opencode/skills/<name>/SKILL.md` with valid frontmatter (`name` matches directory;
lowercase-hyphenated; description present). Grounded in `IMPLEMENTATION_PLAN.md`, `DESIGN.md`,
`AGENTS.md`, and real code paths.

| Skill | Purpose | Path |
|---|---|---|
| orms-architecture | Enforce existing npm/Prisma/JWT architecture; feature-branch continuation; no duplicate backend; secrets server-side; Increment 1 first | `.opencode/skills/orms-architecture/SKILL.md` |
| orms-generation-lifecycle | Server-authoritative success/failure flow; durable RunEvents (monotonic seq); durable SSE; exactly-once settle/refund | `.opencode/skills/orms-generation-lifecycle/SKILL.md` |
| orms-credit-ledger | No negative balances; idempotent signup/reserve/settle/refund; immutable ledger; concurrent-spend safety | `.opencode/skills/orms-credit-ledger/SKILL.md` |
| orms-asset-security | Auth + ownership; no key-only authz; private R2 + short-lived signed access; MIME/size; SSRF-safe downloads; cross-user denial | `.opencode/skills/orms-asset-security/SKILL.md` |
| orms-arabic-rtl | Arabic default + English; RTL/LTR; central catalogs; mixed-script model names; accessibility; responsive | `.opencode/skills/orms-arabic-rtl/SKILL.md` |
| orms-ui-design-system | Grounded in `DESIGN.md`; tokens over literals; RTL-first; required states; no generic AI styling/third-party branding | `.opencode/skills/orms-ui-design-system/SKILL.md` |
| orms-testing-ci | Vitest + DB integration + Playwright; Postgres/Redis CI; mocked OpenRouter; no paid calls; verified vs unverified | `.opencode/skills/orms-testing-ci/SKILL.md` |
| orms-database-migrations | Additive migrations only; no destructive reset; idempotent backfills; existing-data compatibility; disposable-DB-only destructive tests | `.opencode/skills/orms-database-migrations/SKILL.md` |
| orms-provider-router | OpenRouter behind `packages/model-router`; typed metadata; server-side capability/cost; normalized Arabic errors; timeouts; future adapters; no browser secrets | `.opencode/skills/orms-provider-router/SKILL.md` |
| orms-git-delivery | Feature-branch only; meaningful phase commits; push feature branch only; no `main` merge/deploy; update plan only after verification | `.opencode/skills/orms-git-delivery/SKILL.md` |

### Skill inventory

- `.opencode/skills/`: 24 `SKILL.md` files (14 general + 10 ORMS).
- Pre-existing `.claude/skills/.agents/skills/` (heroui-react, design-taste-frontend) are
  Claude/agents-style skills already present in the repo; left **untouched**.

---

## UI/UX Pro Max decision

> **Skipped — not auto-installed/committed.**

The setup brief assumed `CC-BY-NC-4.0`, but the upstream repository
(`nextlevelbuilder/ui-ux-pro-max-skill`, verified 2026-07-23) **now declares MIT** in its
`LICENSE` file and README (`v2.11.0`, Jul 13 2026). Despite MIT (commercial-compatible):

- No explicit install authorization was given during this setup task.
- The brief preferred a repo-native design skill grounded in the project's own `DESIGN.md`.
- Running `uipro init --ai opencode` would pull a large third-party bundle into the repo.

**Decision: skip auto-install; created the custom `orms-ui-design-system` skill instead.** Use
`frontend-ui-engineering` + `orms-ui-design-system` + `DESIGN.md` for all UI work.

If the user later explicitly confirms they want it installed, re-check the license at that time and run:
`npx ui-ux-pro-max-cli init --ai opencode` (do **not** use `--force`; do not overwrite existing skills).

---

## Agents

OpenCode primary + subagents at `.opencode/agents/*.md`. None hard-codes a model ID — subagents
inherit the active primary model. Invocable via `@<name>` (subagents) and the orchestrator is a
`mode: primary` agent.

| Agent | Mode | Temp | Role | Invoked by |
|---|---|---|---|---|
| orms-orchestrator | primary | 0.1 | Read plan; delegate to orms-* + read-only explore/scout; prevent duplicate work; require tests+review; never merge/deploy | user (Tab) — Task tool limited to `orms-*`, `explore`, `scout` (`*` denied) |
| orms-explorer | subagent | 0.1 | Read-only map of routes/packages/imports/models/worker/storage; `edit: deny` | orchestrator / `@orms-explorer` |
| orms-backend | subagent | 0.1 | Prisma, credits, lifecycle, worker, SSE, R2 records, API authz | orchestrator / `@orms-backend` |
| orms-frontend | subagent | 0.35 | Next.js UI, Projects, Asset Library, composer, i18n, RTL, a11y | orchestrator / `@orms-frontend` |
| orms-security | subagent | 0.1 | Read-only audit (authz/SSRF/secrets/idempotency/credit abuse); findings with severity+evidence+test; `edit: deny` | orchestrator / `@orms-security` |
| orms-tests | subagent | 0.1 | Vitest/Playwright/mocks/concurrency/SSE/CI; no paid calls | orchestrator / `@orms-tests` |
| orms-reviewer | subagent | 0.1 | Read-only diff review vs plan; concurrency/security/TS/a11y/tests; GO/NO-GO; `edit: deny` | orchestrator / `@orms-reviewer` |
| orms-research | subagent | 0.1 | Read-only docs/upstream/license research; facts vs recommendations; `edit: deny` | orchestrator / `@orms-research` |

Permissions: read/glob/grep/list/skill broadly allowed; `edit: ask` for mutating agents;
read-only agents (`explorer`, `security`, `reviewer`, `research`) have `edit: deny`. Bash is
`ask` by default with read-only allow-lists (git status/diff/log/branch, npm run/test, prisma
validate/generate); destructive commands (`migrate reset`, `DROP DATABASE`,
`docker compose down -v`) are denied. Push/merge/rebase/reset/commit/add/checkout all `ask`.
`external_directory` is `ask`/`deny`.

The `opencode.json` (`permission.skill`, `permission.bash`) applies global defaults; each agent
frontmatter scopes its own permissions.

---

## Security

- ✅ No secrets committed (no `.env`/`.env.local` created; `.gitignore` ignores `.env`/`.env.*`).
- ✅ No production database modified (only `prisma validate`/`generate`; no migrations run).
- ✅ No paid API called (no OpenRouter / R2 / provider calls during setup).
- ✅ No deployment executed.
- ✅ No `main` merge (checkout of the feature branch only; one file retrieved from `origin/main`).
- ✅ No application feature code changed (`git diff` shows only the `IMPLEMENTATION_PLAN.md`
  add + untracked `.opencode/`, `AGENTS.md`, `opencode.json`).
- ✅ Prisma generated client lives under `node_modules/@prisma/client` (gitignored); no secrets in it.

---

## Files changed

Created (untracked, to be staged):
- `opencode.json` (new — global skill + bash permissions)
- `AGENTS.md` (new — ORMS OpenCode Execution Policy + task→skill mappings)
- `.opencode/references/official-resources.md`
- `.opencode/scripts/verify-setup.sh` (executable)
- `.opencode/skills/<14 general>/SKILL.md`
- `.opencode/skills/<10 orms-*>/SKILL.md`
- `.opencode/agents/orms-{orchestrator,explorer,backend,frontend,security,tests,reviewer,research}.md`

Staged (retrieved from `origin/main`):
- `IMPLEMENTATION_PLAN.md` (new on the feature branch; the handoff doc)

Not changed: no Prisma schema/migrations, no API routes, no React/Next components, no worker,
no model-router source, no credit/SSE/asset logic, no CI, no Dockerfile/compose, no `.env`.

---

## Verification (commands + results)

```bash
git branch --show-current          # feat/complete-generative-studio
git log --oneline -3                # 36ec947, f3139cd present
npm ci                              # 548 packages ok
DATABASE_URL=…dummy… npx prisma validate --schema=packages/db/prisma/schema.prisma  # valid
npx prisma generate --schema=packages/db/prisma/schema.prisma                      # generated
npm --workspace @orms/model-router run typecheck                                    # pass (exit 0)
docker compose up -d db redis       # both healthy
python3 frontmatter validator       # all 24 skills + 8 agents valid
.opencode/scripts/verify-setup.sh   # PASS=44 WARN=1 FAIL=0
```

Frontmatter validation (Python, no new dependency) confirmed:
- all 24 `SKILL.md` have valid frontmatter, `name` matches directory, lowercase-hyphenated.
- all 8 agent `.md` files have `description` + `mode` (`primary`/`subagent`); read-only agents deny `edit`.
- `opencode.json` is valid JSON; skill + bash permission keys present; destructive commands denied.

---

## Remaining manual action (genuine blockers only)

1. **OpenCode restart** — restart OpenCode so the new `.opencode/` skills/agents and `opencode.json`
   are discovered in a fresh session (skills appear via the `skill` tool; subagents via `@`-mention).
2. **npm allow-scripts** — optionally run `npx npm approve-scripts` to authorize the 7 pending
   install scripts (prisma/sharp/sentry/cli/...) if you want postinstall generate to run automatically
   on future installs. Not required for setup (generate was run manually).
3. **`psql` client / host DB access (optional)** — if you want to run migrations/DB integration tests
   from the host (outside Docker), install `postgresql-client` and/or expose the compose `db`/`redis`
   ports. Not required to start Phase 2b implementation; tests/PR review subagents handle DB in CI.
4. **Provider credentials** — `.env`/`.env.local` with real `OPENROUTER_API_KEY`, `DATABASE_URL`, R2,
   and `JWT_SECRET` must be supplied by the user before runtime generation/SSE verification (never
   committed). Place values in `.env` (gitignored) using `.env.example` as a template.
5. **UI/UX Pro Max commercial decision** — skipped during setup (upstream is now MIT). If you want the
   third-party bundle installed, explicitly confirm and run `npx ui-ux-pro-max-cli init --ai opencode`.
6. **Push authorization** — the setup commit will stay local unless you authorize pushing the feature
   branch (`git push origin feat/complete-generative-studio`). Never pushed to `main`.

---

_Setup is complete and verified (externally-blocked items only). No Phase 2b implementation was
started; the next session should instruct the ORMS orchestrator to read `IMPLEMENTATION_PLAN.md`
and begin from Phase 2b._