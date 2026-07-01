# Next.js monorepo — build apps/web and run the standalone server.
# NOTE: Node 22+ is required for the built-in `node:sqlite` module used by the API.

# Stage 1: install deps + build
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Install workspace deps from lockfile (manifests first for layer caching).
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY packages/openrouter/package.json ./packages/openrouter/
COPY packages/db/package.json ./packages/db/
RUN npm ci

# Build the Next.js app (produces .next/standalone).
COPY . .
RUN npm run build

# Stage 2: minimal runtime
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/app/data

# Standalone output (traced from the monorepo root) + static assets.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
