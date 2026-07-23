// GET /api/users/me/credits — current wallet balance + recent ledger entries.
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';
import { getBalance } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const [balance, ledger] = await Promise.all([
      getBalance(userId),
      prisma.creditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, kind: true, amount: true, balanceAfter: true, reason: true, generationId: true, createdAt: true },
      }),
    ]);
    return json({
      balance,
      ledger: ledger.map((l) => ({
        id: l.id,
        kind: l.kind,
        amount: l.amount,
        balance_after: l.balanceAfter,
        reason: l.reason,
        generation_id: l.generationId,
        created_at: l.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}
