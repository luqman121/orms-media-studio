// Integer credit economics. All values are configurable via env with safe defaults
// so the app boots and estimates costs even before billing is wired.
import type { MediaCapability, MediaType } from './types';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

/** Credits granted to a new user on registration. */
export const SIGNUP_CREDITS = envInt('CREDITS_SIGNUP_GRANT', 100);

/** How many credits equal one US dollar of provider spend (for settlement). */
export const CREDITS_PER_USD = envInt('CREDITS_PER_USD', 1000);

/** Convert a provider USD cost (number or string) into integer credits, rounded up. */
export function usdToCredits(usd: number | string | null | undefined): number {
  const n = typeof usd === 'string' ? parseFloat(usd) : usd ?? 0;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.ceil(n * CREDITS_PER_USD));
}

// Pre-flight estimate (integer credits) when the provider only reports actual cost
// after the fact. Kept intentionally coarse and overridable per media type.
const IMAGE_BASE = envInt('CREDITS_ESTIMATE_IMAGE', 5);
const VIDEO_BASE = envInt('CREDITS_ESTIMATE_VIDEO', 50);

export function estimateCredits(mediaType: MediaType, opts?: { count?: number; durationSeconds?: number }): number {
  if (mediaType === 'video') {
    const secs = Math.max(1, Math.round(opts?.durationSeconds ?? 5));
    return VIDEO_BASE * Math.max(1, Math.ceil(secs / 5));
  }
  if (mediaType === 'audio') return IMAGE_BASE;
  const count = Math.max(1, Math.round(opts?.count ?? 1));
  return IMAGE_BASE * count;
}

/** Coarse per-capability unit label for display. */
export function pricingUnit(mediaType: MediaType): string {
  return mediaType === 'video' ? 'second' : mediaType === 'audio' ? 'generation' : 'image';
}

export type { MediaCapability };
