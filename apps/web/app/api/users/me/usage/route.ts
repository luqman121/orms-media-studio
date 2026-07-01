// GET /api/users/me/usage — per-user spend summary (total + per-type breakdown).
import { prisma } from '@orms/db';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);

    const gens = await prisma.generation.findMany({
      where: { userId },
      select: { type: true, cost: true, status: true },
    });

    type Bucket = { count: number; completed: number; cost: number };
    const byType: Record<string, Bucket> = {};
    let totalCost = 0;
    let totalCount = 0;
    let totalCompleted = 0;

    for (const g of gens) {
      if (!byType[g.type]) byType[g.type] = { count: 0, completed: 0, cost: 0 };
      const cost = g.cost ? parseFloat(g.cost) : 0;
      byType[g.type].count++;
      byType[g.type].cost += cost;
      if (g.status === 'completed') {
        byType[g.type].completed++;
        totalCompleted++;
      }
      totalCost += cost;
      totalCount++;
    }

    return json({
      total_generations: totalCount,
      total_completed: totalCompleted,
      total_cost_usd: Math.round(totalCost * 1e8) / 1e8,
      by_type: Object.fromEntries(
        Object.entries(byType).map(([type, b]) => [
          type,
          { count: b.count, completed: b.completed, cost_usd: Math.round(b.cost * 1e8) / 1e8 },
        ]),
      ),
    });
  } catch (e) {
    return handleError(e);
  }
}
