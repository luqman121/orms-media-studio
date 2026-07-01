// BullMQ Queue singleton used by the web app to enqueue video-poll jobs.
// The Worker in apps/worker consumes these jobs. Only initialised when REDIS_URL is set;
// if it's absent the video route falls back to the in-process fire-and-forget poller.
//
// We pass raw connection options (host/port/tls) instead of an IORedis instance to avoid
// a TypeScript type conflict between the standalone `ioredis` package and the copy bundled
// inside `bullmq` — both declare the same class but with incompatible private members.
import { Queue } from 'bullmq';

export interface VideoJobData {
  generationId: number;
  openrouterId: string;
  t0: number;
}

function parseRedisUrl(url: string): Record<string, unknown> {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || 'localhost',
      port: Number(u.port) || 6379,
      ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
      ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
      ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _queue: any = null;

function getQueue(): Queue {
  if (_queue) return _queue;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL not set');
  _queue = new Queue('video-poll', {
    connection: parseRedisUrl(url),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });
  return _queue;
}

export async function enqueueVideoJob(generationId: number, openrouterId: string, t0: number): Promise<void> {
  const data: VideoJobData = { generationId, openrouterId, t0 };
  await getQueue().add('poll', data);
}
