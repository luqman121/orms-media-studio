// Per-user sliding-window rate limiting via Upstash Redis.
// No-ops when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set.
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

let imageRL: Ratelimit | null = null;
let videoRL: Ratelimit | null = null;
let enhanceRL: Ratelimit | null = null;

function imageRateLimit(): Ratelimit | null {
  if (imageRL) return imageRL;
  const r = getRedis();
  if (!r) return null;
  imageRL = new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:img' });
  return imageRL;
}

function videoRateLimit(): Ratelimit | null {
  if (videoRL) return videoRL;
  const r = getRedis();
  if (!r) return null;
  videoRL = new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:vid' });
  return videoRL;
}

function enhanceRateLimit(): Ratelimit | null {
  if (enhanceRL) return enhanceRL;
  const r = getRedis();
  if (!r) return null;
  enhanceRL = new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:enh' });
  return enhanceRL;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export async function checkImageRateLimit(userId: number): Promise<RateLimitResult> {
  const rl = imageRateLimit();
  if (!rl) return { allowed: true, remaining: 999, reset: 0 };
  const { success, remaining, reset } = await rl.limit(String(userId));
  return { allowed: success, remaining, reset };
}

export async function checkVideoRateLimit(userId: number): Promise<RateLimitResult> {
  const rl = videoRateLimit();
  if (!rl) return { allowed: true, remaining: 999, reset: 0 };
  const { success, remaining, reset } = await rl.limit(String(userId));
  return { allowed: success, remaining, reset };
}

export async function checkEnhanceRateLimit(userId: number): Promise<RateLimitResult> {
  const rl = enhanceRateLimit();
  if (!rl) return { allowed: true, remaining: 999, reset: 0 };
  const { success, remaining, reset } = await rl.limit(String(userId));
  return { allowed: success, remaining, reset };
}
