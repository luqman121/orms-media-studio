---
name: orms-database-migrations
description: Load when creating or modifying Prisma schema (packages/db/prisma/schema.prisma) or migrations, writing backfills, or running any DB migration command. Enforces additive-only Prisma migrations, no destructive reset on non-disposable DBs, safe idempotent backfills, existing-data compatibility, indexes/uniqueness, and disposable-DB-only destructive testing.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-database-migrations

## When to use
When editing the Prisma schema, adding a migration, writing a backfill script, or running any
`prisma migrate*` / `prisma db push` / SQL command.

## Files to inspect first
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/0_init` and
  `packages/db/prisma/migrations/20260708120000_increment1_projects_credits_assets_run_events`
- `scripts/backfill-increment1.ts` (idempotent; `Asset` + wallet/signup backfill)
- `apps/web/lib/serialize.ts` (camelCase→snake_case API shape; keep working alongside new rows)
- `IMPLEMENTATION_PLAN.md` §11 (DB & migration requirements)

## Required workflow
1. Make **additive** schema changes only (new tables/columns/indexes/unique constraints).
2. Generate migrations offline (`prisma migrate diff`) when a live DB isn't available; record this.
3. Preserve **existing-data compatibility**: keep `Generation.assetPath` + `serialize.ts` working
   while also writing normalized `Asset` rows.
4. Backfills must be **idempotent** (re-runnable; no duplicate rows; keyed lookups).
5. Add appropriate indexes and uniqueness constraints; keep every tenant-owned record carrying `userId`.
6. Test migrations on a **clean database**; test existing-data migration where possible.
7. Apply committed migrations with `npm run migrate:deploy` against a real Postgres only when `DATABASE_URL` is set and non-production.

## Invariants
- **Never** run `prisma migrate reset` / `DROP DATABASE` / `docker compose down -v` on a
  non-disposable database.
- Destructive commands are allowed **only** against an explicitly-confirmed disposable test DB.
- Migrations are additive; no destructive drops of existing tables/columns in Increment 1.
- Credit operations are **transactional**; tenant-owned records carry `userId`.
- Baseline migration is `0_init`; Phase 1 added the `increment1_*` migration.

## Prohibited shortcuts
- `prisma migrate reset` or `db push --force-reset` on shared data.
- Editing a committed migration file in lieu of creating a new one.
- Backfills that aren't idempotent.
- Dropping `assetPath`/`serialize.ts` before normalized `Asset` rows fully replace it.

## Verification commands
```bash
DATABASE_URL=postgresql://x:x@localhost:5432/x npx prisma validate --schema=packages/db/prisma/schema.prisma
npx prisma generate --schema=packages/db/prisma/schema.prisma
# On a real non-production DB:
npm run migrate:deploy
npx tsx scripts/backfill-increment1.ts   # idempotent
```

## Evidence required before claiming completion
- New migration file added additively; `prisma validate` + `prisma generate` succeed.
- Backfill shown idempotent (re-run produces no new rows).
- Migration applies on a clean disposable DB; existing-data path handled.

## Definition of done
Migration is additive and validated, backfill is idempotent, existing-data compatibility is
preserved, and destructive actions were confined to disposable databases.