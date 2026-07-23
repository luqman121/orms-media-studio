// GET /api/generate/generations/[id]/events
// Phase 2b, Slice 3 — durable, refresh-surviving SSE endpoint.
//
// Sources events from the **persisted `RunEvent` table** (written by Slices 1/2 via
// `appendRunEvent` in `@orms/generation-runtime`). No in-memory emitter, no Redis
// pub/sub — polling durable rows is sufficient because a generation emits only a
// handful of events. Survives a page refresh because the client reconnects with
// `Last-Event-ID` and we replay every durable row with `seq > lastEventId`.
//
// Authorization: `requireAuth` + `prisma.generation.findFirst({ where: { id, userId } })`.
// Because the `generationId` is verified to belong to the caller BEFORE any RunEvent
// query, and RunEvents are queried solely by that verified `generationId`, NO foreign
// user's events can ever appear on this stream. This is the only authorization boundary
// the stream needs (see `orms-asset-security` invariant: ownership-based, never
// object-key-based).
import { prisma } from '@orms/db';
import { getTranslations } from 'next-intl/server';
import { requireAuth } from '@/lib/auth';
import { json, handleError } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const POLL_INTERVAL_MS = 1000; // tail new RunEvents every 1s
const HEARTBEAT_INTERVAL_MS = 15000; // keep-alive comment every 15s
const TERMINAL_STATUSES = new Set(['completed', 'failed']);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(req: Request, ctx: Ctx) {
  let userId: number;
  try {
    userId = requireAuth(req);
  } catch (e) {
    return handleError(e);
  }

  // Resolve the request locale's error catalog up front (route-handler scope has
  // the cookie context; the ReadableStream `start` callback runs later and shares
  // these resolved strings via closure — no next-intl call inside the stream).
  const t = await getTranslations('errors');
  const notFoundMsg = t('generic.notFound');
  const streamErrorMsg = t('sse.streamError');

  const { id } = await ctx.params;
  const generationId = Number(id);
  if (!Number.isInteger(generationId) || generationId <= 0) {
    return json({ error: notFoundMsg }, 404);
  }

  // Ownership-scoped lookup: NEVER `findUnique({ where: { id } })` alone — that would
  // leak another user's generation. This single check is the cross-user denial boundary.
  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId },
    select: { id: true, status: true },
  });
  if (!generation) {
    return json({ error: notFoundMsg }, 404);
  }

  // Parse Last-Event-ID (carries the last `seq` the client saw). Absent → replay all.
  const lastEventIdHeader = req.headers.get('last-event-id');
  let lastSentSeq = 0;
  if (lastEventIdHeader != null) {
    const parsed = Number.parseInt(lastEventIdHeader, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      lastSentSeq = parsed;
    }
  }

  const enc = new TextEncoder();

  // Shared across `start` and `cancel` so a client disconnect immediately stops the
  // poll loop — no reliance on a later enqueue throwing. No setInterval/setTimeout
  // timers are used (we `await sleep`), so there is nothing else to clear on cancel.
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastHeartbeatAt = Date.now();

      const enqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {
          // controller may already be closed (client gone) — stop writing.
          closed = true;
        }
      };

      // SSE event: `id: <seq>\n` + `event: <type>\n` + `data: <json>\n\n`.
      // The SSE `id` is the RunEvent `seq` so Last-Event-ID carries the durable
      // cursor, not our internal uuid.
      const sendEvent = (ev: { seq: number; type: string; dataJson: string | null }) => {
        const data = ev.dataJson && ev.dataJson.trim() !== '' ? ev.dataJson : '{}';
        enqueue(`id: ${ev.seq}\nevent: ${ev.type}\ndata: ${data}\n\n`);
      };

      const sendHeartbeat = () => {
        enqueue(': heartbeat\n\n');
        lastHeartbeatAt = Date.now();
      };

      const sendErrorAndClose = (message: string) => {
        enqueue(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        close();
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      try {
        // Initial drain: replay all durable rows with seq > lastSentSeq. This handles
        // both fresh connects (lastSentSeq=0 → all events) and reconnects.
        let initialEvents = await prisma.runEvent.findMany({
          where: { generationId, seq: { gt: lastSentSeq } },
          orderBy: { seq: 'asc' },
        });
        for (const ev of initialEvents) {
          sendEvent(ev);
          lastSentSeq = ev.seq;
        }

        // If the generation was already terminal at connect time, we have just replayed
        // its full history (including the terminal RunEvent written by Slices 1/2) — close.
        // Re-scope with userId for defense-in-depth (ownership was verified at connect;
        // Generation.userId is immutable, but this keeps the cross-user boundary local).
        let status = await prisma.generation.findFirst({
          where: { id: generationId, userId },
          select: { status: true },
        });
        if (!status) {
          // Generation was deleted while streaming — nothing more to emit.
          close();
          return;
        }
        if (TERMINAL_STATUSES.has(status.status)) {
          // Initial-drain terminal: re-drain once more (the terminal RunEvent may have
          // been committed between the initial findMany above and this status read), then
          // close. Mirrors the tail loop's terminal-drain at lines 202–210 so a client
          // connecting just as the generation flips to terminal still receives the final
          // event (reviewer finding: SSE initial-connect terminal race).
          try {
            const tail = await prisma.runEvent.findMany({
              where: { generationId, seq: { gt: lastSentSeq } },
              orderBy: { seq: 'asc' },
            });
            for (const ev of tail) {
              sendEvent(ev);
              lastSentSeq = ev.seq;
            }
          } catch (e) {
            console.error('[sse] initial terminal drain failed', (e as Error)?.message);
            sendErrorAndClose(streamErrorMsg);
            return;
          }
          close();
          return;
        }

        // Tail loop: poll for new RunEvents, emit heartbeats, close on terminal.
        while (!closed) {
          await sleep(POLL_INTERVAL_MS);
          if (closed) break;

          // Heartbeat every ~15s to keep the connection alive through proxies.
          if (Date.now() - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
            sendHeartbeat();
          }

          // Drain any new durable rows since the last sent seq.
          let newEvents: { seq: number; type: string; dataJson: string | null }[];
          try {
            newEvents = await prisma.runEvent.findMany({
              where: { generationId, seq: { gt: lastSentSeq } },
              orderBy: { seq: 'asc' },
            });
          } catch (e) {
            // DB error mid-stream: log server-side (no secrets), Arabic client message.
            console.error('[sse] runEvent poll failed', (e as Error)?.message);
            sendErrorAndClose(streamErrorMsg);
            return;
          }
          for (const ev of newEvents) {
            sendEvent(ev);
            lastSentSeq = ev.seq;
          }

          // Re-check terminal state. When the generation reaches `completed`/`failed`
          // AND all its RunEvents have been flushed (lastSentSeq is the max seq), close.
          try {
            status = await prisma.generation.findFirst({
              where: { id: generationId, userId },
              select: { status: true },
            });
          } catch (e) {
            console.error('[sse] status re-check failed', (e as Error)?.message);
            sendErrorAndClose(streamErrorMsg);
            return;
          }
          if (!status) {
            close();
            return;
          }
          if (TERMINAL_STATUSES.has(status.status)) {
            // The terminal RunEvent (completed/failed) is itself a durable row written
            // by Slices 1/2. Drain any final rows that arrived between the poll above
            // and the status flip, then close.
            try {
              const tail = await prisma.runEvent.findMany({
                where: { generationId, seq: { gt: lastSentSeq } },
                orderBy: { seq: 'asc' },
              });
              for (const ev of tail) {
                sendEvent(ev);
                lastSentSeq = ev.seq;
              }
            } catch (e) {
              console.error('[sse] terminal drain failed', (e as Error)?.message);
              sendErrorAndClose(streamErrorMsg);
              return;
            }
            close();
            return;
          }
        }
      } catch (e) {
        // Uncaught error in the stream loop: log server-side, send a safe Arabic
        // message, never leak stack traces / secrets to the client.
        console.error('[sse] stream loop error', (e as Error)?.message);
        sendErrorAndClose(streamErrorMsg);
      }
    },
    cancel() {
      // Client disconnected: flip the shared `closed` flag so the poll loop exits on
      // its next `await sleep` resolution. Because we use `await sleep` (not
      // setInterval/setTimeout timers), there is nothing else to clear — no leaked
      // timers. The loop's next iteration observes `closed` and returns.
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable proxy buffering (best-effort; harmless if ignored).
      'X-Accel-Buffering': 'no',
    },
  });
}