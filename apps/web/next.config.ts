import type { NextConfig } from 'next';
import path from 'node:path';
import fs from 'node:fs';
import { withSentryConfig } from '@sentry/nextjs';

// In a monorepo, Next.js runs from apps/web/ and only loads .env from that directory.
// The shared .env lives two levels up at the repo root — load it here so DATABASE_URL
// and other vars are available to route handlers (Prisma, R2, JWT, OpenRouter).
// In Docker standalone mode cwd=/app, so the path resolves to /.env (doesn't exist) → skip.
const rootEnvPath = path.join(process.cwd(), '..', '..', '.env');
if (fs.existsSync(rootEnvPath)) {
  for (const line of fs.readFileSync(rootEnvPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    // Strip surrounding quotes.
    if (/^["'].*["']$/.test(val)) val = val.slice(1, -1);
    // Don't override vars already set (e.g. from the real process environment or CI).
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

const nextConfig: NextConfig = {
  // Self-hosted long-running server output (container deploy, not serverless).
  output: 'standalone',
  // Trace from the monorepo root so the standalone bundle includes workspace packages.
  outputFileTracingRoot: path.join(process.cwd(), '..', '..'),
  // Transpile shared TS workspace packages directly from source (no build step).
  transpilePackages: ['@orms/openrouter', '@orms/db'],
  // Keep Prisma external so its native engine is loaded at runtime, not bundled.
  serverExternalPackages: ['@prisma/client', 'prisma'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

// Wrap with Sentry when configured; skip transparently in local dev.
const hasSentry = Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);
export default hasSentry
  ? withSentryConfig(nextConfig, {
      telemetry: false,
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Disable source map upload when SENTRY_AUTH_TOKEN is not available.
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
    })
  : nextConfig;
