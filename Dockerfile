# Next.js monorepo — build apps/web and run the standalone server.

# Stage 1: install deps + build
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/openrouter/package.json ./packages/openrouter/
COPY packages/db/package.json ./packages/db/
RUN npm ci

# The root `build` script runs `prisma generate` first so the query engine is produced here.
COPY . .
RUN npm run build

# Stage 2: minimal runtime
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone output (traced from the monorepo root) + static assets.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# Prisma is external (not bundled): ship the generated client + native query engine.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
# Migrations are applied by the compose `migrate` service; this just runs the app.
CMD ["node", "apps/web/server.js"]
