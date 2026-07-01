// ORMS video-poll worker entry point.
// Starts a BullMQ Worker that processes 'video-poll' jobs (one job per video generation)
// and an Express server serving the Bull Board admin UI on BOARD_PORT (default 4001).
//
// Required env vars: REDIS_URL, DATABASE_URL, OPENROUTER_API_KEY,
//                    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// Optional:          ADMIN_SECRET (Bearer token for Bull Board; open if unset),
//                    BOARD_PORT (default 4001), WORKER_CONCURRENCY (default 5)
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import express from 'express';
import { processVideoJob } from './processor.js';

// Load root .env (monorepo: worker runs from apps/worker/, .env lives at repo root).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const rootEnvPath = join(fileURLToPath(import.meta.url), '..', '..', '..', '..', '.env');
if (existsSync(rootEnvPath)) {
  for (const line of readFileSync(rootEnvPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (/^["'].*["']$/.test(val)) val = val.slice(1, -1);
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BOARD_PORT = Number(process.env.BOARD_PORT ?? 4001);
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 5);

// BullMQ requires maxRetriesPerRequest: null on the ioredis connection.
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const queue = new Queue('video-poll', { connection });

const worker = new Worker('video-poll', processVideoJob, {
  connection,
  concurrency: CONCURRENCY,
});

worker.on('completed', (job) =>
  console.log(`[worker] job ${job.id} (gen=${job.data.generationId}) completed`),
);
worker.on('failed', (job, err) =>
  console.error(`[worker] job ${job?.id} (gen=${job?.data?.generationId}) failed: ${err.message}`),
);

// Bull Board admin UI
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({ queues: [new BullMQAdapter(queue)], serverAdapter });

const app = express();

if (ADMIN_SECRET) {
  app.use('/admin/queues', (req, res, next) => {
    if (req.headers.authorization === `Bearer ${ADMIN_SECRET}`) return next();
    res.status(401).json({ error: 'Unauthorized' });
  });
} else {
  console.warn('[worker] ADMIN_SECRET not set — Bull Board is open without auth');
}

app.use('/admin/queues', serverAdapter.getRouter());
app.get('/health', (_req, res) => res.json({ ok: true, queue: 'video-poll' }));

app.listen(BOARD_PORT, () =>
  console.log(`[worker] started — Bull Board at http://localhost:${BOARD_PORT}/admin/queues`),
);

// Graceful shutdown: drain the worker before exiting so in-flight jobs finish.
async function shutdown(signal: string) {
  console.log(`[worker] ${signal} received — shutting down`);
  await worker.close();
  await queue.close();
  await connection.quit();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
