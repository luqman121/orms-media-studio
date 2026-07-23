---
name: orms-credit-ledger
description: Load when implementing or reviewing any credit/accounting behavior in apps/web/lib/credits.ts, packages/model-router/src/credits.ts, the registration signup grant (apps/web/app/api/auth/register/route.ts), or the credits/usage APIs. Enforces the durable integer credit ledger invariants (no negative balances, idempotent signup/reserve/settle/refund, immutable append-only ledger, concurrent-spend safety) and the required tests.
license: Proprietary project instructions
compatibility: OpenCode project-local skill for ORMS Media Studio
---

# orms-credit-ledger

## When to use
Whenever you touch credit math, wallet balance, ledger rows, signup grants, reservation,
settlement, or refunds, and when adding tests for those flows.

## Files to inspect first
- `apps/web/lib/credits.ts` (`getBalance`, `grantSignupCredits`, `reserveCredits`,
  `settleCredits`, `refundCredits`, `applyDelta`, `InsufficientCreditsError`)
- `packages/model-router/src/credits.ts` (`SIGNUP_CREDITS`, `CREDITS_PER_USD`,
  `usdToCredits`, `estimateCredits`, `pricingUnit`)
- `apps/web/app/api/auth/register/route.ts` (idempotent grant call)
- `apps/web/app/api/users/me/credits/route.ts`, `apps/web/app/api/users/me/usage/route.ts`
- `packages/db/prisma/schema.prisma` — `CreditWallet`, `CreditLedger`
- `IMPLEMENTATION_PLAN.md` §10 (credit invariants), §14 (required tests)

## Required workflow
1. All balance changes go through `applyDelta` inside `prisma.$transaction`: upsert wallet,
   compute next balance, floor at 0, write the `CreditLedger` row.
2. Every mutating op carries an `idempotencyKey` unique on `CreditLedger`; a duplicate key
   short-circuits to the recorded `balanceAfter` (no double effect) — detect via Prisma `P2002`.
3. Reserve **before** provider submit (throws `InsufficientCreditsError`, HTTP 402, on shortfall).
4. Settle once per generation: reconcile reservation vs real cost (refund difference or charge
   delta; floor at 0; `allowNegative: true` so settlement never blocks).
5. Refund once per generation on failure (full reserved amount back).
6. Use **integer credit units** everywhere; convert USD via `usdToCredits` / `CREDITS_PER_USD`.

## Invariants (must hold and be tested)
- Wallet balance can never go negative (`applyDelta` floors at 0; reserve rejects shortfalls).
- A reservation **cannot exceed** available balance.
- Duplicate idempotency keys **cannot double-reserve**.
- Settlement happens **once** per generation.
- Refund happens **once** per generation.
- A settled reservation **cannot be reused** to grant free work.
- Concurrent requests **cannot overspend** (transactional wallet update; add a real-DB
  concurrency test — consider `SELECT … FOR UPDATE`/serializable if a gap is found).
- Ledger entries are **immutable** (append-only; never `update`/`delete` rows).
- Signup grant is **idempotent**.

## Prohibited shortcuts
- Updating wallet without writing a ledger row, or vice versa.
- Reusing an idempotency key across different operations.
- Trusting client-reported credit amounts.
- Hardcoding balance math outside `applyDelta`.

## Verification commands
```bash
npm --workspace @orms/model-router run typecheck
npx prisma generate --schema=packages/db/prisma/schema.prisma
# Integration tests (Phase 5) against a disposable Postgres:
#   signup grant + idempotency; reserve success + insufficient rejection;
#   settle (refund-difference + extra-charge); refund once; duplicate key no-op;
#   concurrent reservation no overspend.
```

## Evidence required before claiming completion
- Test results for every invariant above on a real (disposable) Postgres.
- Confirmation that no path mutates/deletes a `CreditLedger` row.
- Evidence the duplicate-idempotency-key path returns the recorded balance without re-charging.

## Definition of done
All credit invariants hold under deterministic integration tests (including concurrency), the
ledger stays append-only, and every op is idempotent and transactional.