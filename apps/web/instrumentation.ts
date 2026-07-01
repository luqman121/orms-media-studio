// Next.js 15 instrumentation hook — loads Sentry when SENTRY_DSN is set.
// captureRequestError is exported as onRequestError so Next.js auto-captures route errors.
export { captureRequestError as onRequestError } from '@sentry/nextjs';

export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
