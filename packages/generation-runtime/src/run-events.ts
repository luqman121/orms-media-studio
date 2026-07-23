// Durable RunEvent writer with a monotonic per-generation `seq`.
// The (generationId, seq) unique constraint is the correctness backstop: if two
// concurrent writers pick the same seq, one wins and the other retries with a
// freshly computed seq — events are never silently dropped.
//
// Both the BullMQ worker (apps/worker) and the in-process fallback
// (apps/web/lib/videoPoll.ts) MUST write RunEvents through this helper so the
// durable SSE endpoint (Phase 2b, later slice) can replay an identical stream.
import { prisma } from '@orms/db';

/** Lifecycle event types for a generation run. Matches the RunEvent.type catalog. */
export type RunEventType =
  | 'created'
  | 'queued'
  | 'submitted'
  | 'started'
  | 'provider_submitted'
  | 'processing'
  | 'downloading'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AppendRunEventInput {
  generationId: number;
  userId: number;
  type: RunEventType;
  /** Optional JSON-stringified payload (provider ids, asset refs, error shape, …). */
  dataJson?: string;
}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { code?: string }).code === 'P2002'
  );
}

/**
 * Append one RunEvent with a per-generation monotonic `seq`.
 *
 * The next `seq` is computed inside the same `prisma.$transaction` as the
 * `runEvent.create` (max(seq)+1). On a unique-constraint violation (a concurrent
 * writer grabbed the same seq) the whole transaction is retried — up to
 * `MAX_RETRIES` — with a recomputed seq. A unique violation after the last retry
 * is re-thrown so the caller never silently loses an event.
 */
export async function appendRunEvent(input: AppendRunEventInput): Promise<void> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        const last = await tx.runEvent.findFirst({
          where: { generationId: input.generationId },
          orderBy: { seq: 'desc' },
          select: { seq: true },
        });
        const nextSeq = (last?.seq ?? 0) + 1;
        await tx.runEvent.create({
          data: {
            generationId: input.generationId,
            userId: input.userId,
            seq: nextSeq,
            type: input.type,
            dataJson: input.dataJson,
          },
        });
      });
      return;
    } catch (e) {
      if (isUniqueViolation(e) && attempt < MAX_RETRIES - 1) {
        // A concurrent writer committed this seq first; recompute and retry.
        continue;
      }
      throw e;
    }
  }
}