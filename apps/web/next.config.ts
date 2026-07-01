import type { NextConfig } from 'next';
import path from 'node:path';

// Phase 3: persistence is PostgreSQL via Prisma (@orms/db). The API lives in
// native route handlers (app/api/**). `@prisma/client` loads a native query engine
// at runtime, so it must stay external (not webpack-bundled).
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

export default nextConfig;
