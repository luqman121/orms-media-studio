// Durable integer credit ledger (single-tenant, per userId). Every balance change is
// an append-only CreditLedger row plus a CreditWallet update inside one transaction.
// Idempotency: each mutating op takes an idempotencyKey unique on CreditLedger, so a
// retried request (or duplicate webhook/job) never double-charges.
import { prisma } from '@orms/db';
import { SIGNUP_CREDITS } from '@orms/model-router';

export class InsufficientCreditsError extends Error {
  status = 402;
  constructor() {
    super('الرصيد غير كافٍ لإتمام هذا التوليد');
    this.name = 'InsufficientCreditsError';
  }
}

type LedgerKind = 'signup' | 'reserve' | 'settle' | 'refund' | 'adjust';

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';
}

/** Current balance (0 if the wallet has not been created yet). */
export async function getBalance(userId: number): Promise<number> {
  const w = await prisma.creditWallet.findUnique({ where: { userId } });
  return w?.balance ?? 0;
}

/** Idempotently grant the signup allotment. Safe to call on every register. */
export async function grantSignupCredits(userId: number): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.creditWallet.upsert({
        where: { userId },
        create: { userId, balance: SIGNUP_CREDITS },
        update: { balance: { increment: SIGNUP_CREDITS } },
      }),
      prisma.creditLedger.create({
        data: {
          userId,
          kind: 'signup',
          amount: SIGNUP_CREDITS,
          balanceAfter: SIGNUP_CREDITS,
          reason: 'signup grant',
          idempotencyKey: `signup:${userId}`,
        },
      }),
    ]);
  } catch (e) {
    if (isUniqueViolation(e)) return; // already granted
    throw e;
  }
}

async function applyDelta(
  userId: number,
  kind: LedgerKind,
  amount: number,
  opts: { generationId?: number; reason?: string; idempotencyKey: string; allowNegative?: boolean },
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    // Idempotent short-circuit: if this key already recorded, return the recorded balance.
    const existing = await tx.creditLedger.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
    if (existing) return existing.balanceAfter;

    const wallet = await tx.creditWallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });
    const next = wallet.balance + amount;
    if (next < 0 && !opts.allowNegative) throw new InsufficientCreditsError();
    const balanceAfter = Math.max(0, next);

    await tx.creditWallet.update({ where: { userId }, data: { balance: balanceAfter } });
    await tx.creditLedger.create({
      data: {
        userId,
        kind,
        amount,
        balanceAfter,
        generationId: opts.generationId,
        reason: opts.reason,
        idempotencyKey: opts.idempotencyKey,
      },
    });
    return balanceAfter;
  });
}

/** Reserve credits before submitting to a provider. Throws InsufficientCreditsError. */
export async function reserveCredits(
  userId: number,
  amount: number,
  opts: { generationId: number; idempotencyKey: string },
): Promise<number> {
  if (amount <= 0) return getBalance(userId);
  return applyDelta(userId, 'reserve', -Math.round(amount), {
    generationId: opts.generationId,
    reason: 'generation reserve',
    idempotencyKey: `reserve:${opts.idempotencyKey}`,
  });
}

/**
 * Settle a completed generation: reconcile the reservation against the real cost.
 * Refunds the difference if the final cost was lower, or charges the delta if higher.
 */
export async function settleCredits(
  userId: number,
  opts: { generationId: number; reservedCredits: number; finalCredits: number; idempotencyKey: string },
): Promise<number> {
  const delta = opts.reservedCredits - opts.finalCredits; // >0 => refund, <0 => extra charge
  if (delta === 0) return getBalance(userId);
  return applyDelta(userId, 'settle', delta, {
    generationId: opts.generationId,
    reason: 'generation settle',
    idempotencyKey: `settle:${opts.idempotencyKey}`,
    allowNegative: true, // never block settlement; floor at 0
  });
}

/** Release a reservation when a generation fails (full refund of what was reserved). */
export async function refundCredits(
  userId: number,
  opts: { generationId: number; amount: number; idempotencyKey: string; reason?: string },
): Promise<number> {
  if (opts.amount <= 0) return getBalance(userId);
  return applyDelta(userId, 'refund', Math.round(opts.amount), {
    generationId: opts.generationId,
    reason: opts.reason ?? 'generation refund',
    idempotencyKey: `refund:${opts.idempotencyKey}`,
  });
}