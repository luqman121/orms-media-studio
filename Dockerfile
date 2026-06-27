# Multi-stage Dockerfile — frontend build, then run backend serving static + API

# Stage 1: build frontend
FROM node:20-slim AS builder-frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: install backend + copy static
FROM node:20-slim
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production
COPY backend/src ./src
COPY --from=builder-frontend /app/frontend/dist ./public
RUN mkdir -p /app/data/uploads /app/data/assets
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/app/data/app.db \
    UPLOADS_DIR=/app/data/uploads \
    ASSETS_DIR=/app/data/assets
EXPOSE 3001
CMD [ "node", "src/index.js" ]