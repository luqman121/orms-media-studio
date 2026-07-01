import type { NextConfig } from 'next';

// Phase 1: proxy /api/* to the still-running Express backend so the UI is a pure
// transplant with zero backend change. Phases 2+ replace these with native route
// handlers, and this rewrites() block is removed.
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Self-hosted long-running server output (container deploy, not serverless).
  output: 'standalone',
  // Transpile the shared workspace packages directly from TS source (no build step).
  transpilePackages: ['@orms/openrouter', '@orms/db'],
  eslint: {
    // Lint is run separately; don't block builds on it during the migration.
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
