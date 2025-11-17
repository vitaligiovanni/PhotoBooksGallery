#### Backend Dockerfile (multi-stage, production-ready)
# 1) Builder stage: install all deps and build TypeScript
FROM node:20-alpine AS builder
WORKDIR /workspace

# Install OS packages needed during build
RUN apk add --no-cache python3 make g++

# Prepare backend workspace and install dev dependencies inside backend folder
WORKDIR /workspace/backend
COPY backend/package*.json ./
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
RUN npm install --include=dev --no-audit --no-fund
## Ensure @types/node is present (some environments miss it due to cache quirks)
RUN npm ls @types/node || npm install -D @types/node@latest --no-audit --no-fund
RUN ls -la node_modules/@types || true && npm ls @types/node || true

## Also install dependencies for the shared package so TS can resolve its imports during build
WORKDIR /workspace/shared
COPY shared/package*.json ./
RUN npm install --no-audit --no-fund

## Copy shared and backend source
# Place shared at /workspace/shared and backend sources into current dir
WORKDIR /workspace
COPY shared ./shared
COPY backend ./backend

# Build from backend directory (node_modules installed here)
WORKDIR /workspace/backend
RUN echo "Debug types in $(pwd)" && ls -la node_modules | head -n 50 && ls -la node_modules/@types || true && ls -la node_modules/@types/node || true
RUN echo "Debug shared node_modules at /workspace/shared" && ls -la /workspace/shared || true && ls -la /workspace/shared/node_modules || true && ls -la /workspace/shared/node_modules/zod || true
RUN npm run build

# 2) Production runtime: only production deps + built artifacts
FROM node:20-alpine AS runtime
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package manifests and install only production deps
COPY backend/package*.json ./
# Install only production dependencies
RUN npm install --omit=dev --prefer-offline --no-audit --no-fund

# Copy built app and necessary runtime files
COPY --from=builder /workspace/backend/dist ./dist
COPY --from=builder /workspace/backend/.env* ./
COPY --from=builder /workspace/backend/public ./public
RUN mkdir -p uploads

# Expose API port
EXPOSE 5002

# Healthcheck (route is defined at '/health' in src/index.ts)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:5002/health || exit 1

# Start application (compiled entry at dist/backend/src/index.js due to TS include of ../shared)
CMD ["node", "dist/backend/src/index.js"]