import type { NextConfig } from 'next';
import path from 'node:path';

// Phase 2: the API now lives in native route handlers (app/api/**). The Express
// backend and the /api/* rewrite are gone. Persistence uses Node's built-in
// `node:sqlite` (DatabaseSync) — no native addon to bundle/compile. Phase 3 swaps
// SQLite for Postgres/Prisma.
const nextConfig: NextConfig = {
  // Self-hosted long-running server output (container deploy, not serverless).
  output: 'standalone',
  // Trace from the monorepo root so the standalone bundle includes workspace packages.
  outputFileTracingRoot: path.join(process.cwd(), '..', '..'),
  // Transpile shared workspace packages directly from TS source (no build step).
  transpilePackages: ['@orms/openrouter', '@orms/db'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
