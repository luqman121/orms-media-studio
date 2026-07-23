# AGENTS.md — ORMS Media Studio

This file gives agent-driven engineering rules for ORMS Media Studio. It complements
`CLAUDE.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md`. When this file conflicts with the
actual code, **trust the code** but record the discrepancy.

> Stack (verified from the repo): npm workspaces · Prisma + PostgreSQL · custom JWT
> (`apps/web/lib/auth.ts`) · Next.js 15 App Router · BullMQ worker · Cloudflare R2 (S3 SDK) ·
> OpenRouter only (behind `packages/model-router`). No pnpm/yarn/Drizzle/Auth.js/OAuth.

## ORMS OpenCode Execution Policy

1. Read `IMPLEMENTATION_PLAN.md` before implementation.
2. Work on `feat/complete-generative-studio` (commits `f3139cd` Phase 1, `36ec947` Phase 2a
   must be present). Do not work from `main`.
3. Load the applicable skills before acting (see task→skill mappings below).
4. Use `orms-explorer` before broad multi-package edits (map routes/packages/imports/models first).
5. Use `orms-backend` for Prisma, credits, generation, worker, SSE, and storage.
6. Use `orms-frontend` for Projects, Asset Library, composer, i18n, RTL, and accessibility.
7. Use `orms-security` before completing any auth, asset, provider, or credit work.
8. Use `orms-tests` to add deterministic coverage (mocked OpenRouter; no paid provider calls).
9. Use `orms-reviewer` before each phase commit.
10. Do not merge to `main`.
11. Do not deploy.
12. Do not expose secrets (provider/R2 keys stay server-side; no client-side provider calls).
13. Do not fake unsupported product modes (keep them hidden behind feature flags; no dead tabs/mock data).
14. Do not claim runtime verification without evidence; clearly separate **verified** vs **unverified**.
15. Update the plan checkboxes + commit hashes only **after verified** completion.
16. Actual code overrides stale documentation when they conflict, but discrepancies must be documented.

Destructive database actions (`prisma migrate reset`, `DROP DATABASE`,
`docker compose down -v`, editing committed migrations) are prohibited except on an explicitly
confirmed disposable test database. Additive Prisma migrations only (see `orms-database-migrations`).

## Task → skill & agent mappings

| Work type | Load skills | Delegate to |
|---|---|---|
| Any multi-package/structural change | `orms-architecture` + `incremental-implementation` | `orms-explorer` (map) → `orms-backend`/`orms-frontend` |
| Generation pipeline (image sync/SSE, video async), SSE, RunEvents | `orms-generation-lifecycle`, `api-and-interface-design`, `test-driven-development` | `orms-backend` |
| Credits / wallet / ledger / signup grant | `orms-credit-ledger`, `security-and-hardening` | `orms-backend` (reviewed by `orms-security`) |
| Prisma schema / migrations / backfills | `orms-database-migrations`, `deprecation-and-migration` | `orms-backend` |
| Model metadata / capabilities / cost / error normalization / future adapters | `orms-provider-router`, `api-and-interface-design` | `orms-backend`/`orms-research` |
| Asset access, authz, signing, SSRF, secrets, idempotency | `orms-asset-security`, `security-and-hardening` | `orms-security` (read-only review) |
| UI: components, layouts, styles, tokens, RTL, states | `orms-ui-design-system`, `orms-arabic-rtl`, `frontend-ui-engineering` | `orms-frontend` |
| Localization (next-intl, Arabic/English, RTL/LTR) | `orms-arabic-rtl`, `orms-ui-design-system` | `orms-frontend` |
| Tests and CI (Vitest/Playwright/migration/build) | `orms-testing-ci`, `test-driven-development` | `orms-tests` |
| Code review / phase commit | `code-review-and-quality`, `security-and-hardening` | `orms-reviewer` |
| Upstream/docs/dependency/license research | `source-driven-development`, `documentation-and-adrs` | `orms-research` |
| Git/branch/commit/push discipline | `orms-git-delivery`, `git-workflow-and-versioning` | orchestrator |
| Performance work | `performance-optimization`, `observability-and-instrumentation` | `orms-backend`/`orms-reviewer` |

## Skill & agent discovery

- Skills live in `.opencode/skills/<name>/SKILL.md` (project-native OpenCode path) — 24 installed
  (14 general engineering skills from `addyosmani/agent-skills` MIT, plus 10 ORMS-specific).
- Reference catalog: `.opencode/references/official-resources.md`.
- Reference listing is also at `.opencode/references/official-resources.md`.
- Specialized subagents live in `.opencode/agents/*.md`:
  `orms-orchestrator` (primary), `orms-explorer`, `orms-backend`, `orms-frontend`,
  `orms-security`, `orms-tests`, `orms-reviewer`, `orms-research` (subagents, `@`-mentionable).
- The orchestrator may only invoke `orms-*` subagents and the built-in read-only `explore`/`scout`.
- Subagents inherit the active primary model; no model IDs are hard-coded.

## UI/UX Pro Max license note

Upstream currently declares **MIT**, but the third-party bundle was **not** auto-installed/committed
during setup (no explicit install authorization; brief preferred a repo-native skill). ORMS uses a
custom `orms-ui-design-system` skill grounded in `DESIGN.md` instead. See `SETUP_REPORT.md`.