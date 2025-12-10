#### Backend Dockerfile (multi-stage, production-ready)
# 1) Builder stage: install all deps and build TypeScript
# Using node:20-slim (Debian-based) instead of Alpine for canvas prebuilt binaries
FROM node:20-slim AS builder
WORKDIR /workspace

# Install OS packages needed during build (canvas dependencies)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    libpixman-1-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Prepare backend workspace and install dev dependencies inside backend folder
WORKDIR /workspace/backend
COPY backend/package*.json ./
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false

# Configure npm для лучшей стабильности сети
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

RUN npm install --include=dev --no-audit --no-fund --prefer-offline || \
    (sleep 10 && npm install --include=dev --no-audit --no-fund --prefer-offline) || \
    (sleep 20 && npm install --include=dev --no-audit --no-fund)
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
# Using node:20-slim for glibc compatibility with canvas prebuilt binaries
FROM node:20-slim AS runtime
WORKDIR /app

# Install curl for healthcheck и runtime зависимости для canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgif7 \
    libpixman-1-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests and install only production deps
COPY backend/package*.json ./

# Configure npm для стабильности сети
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Install only production dependencies with retry
RUN npm install --omit=dev --prefer-offline --no-audit --no-fund || \
    (sleep 10 && npm install --omit=dev --prefer-offline --no-audit --no-fund) || \
    (sleep 20 && npm install --omit=dev --no-audit --no-fund)

# Copy pre-compiled canvas native bindings from builder (avoids recompilation)
COPY --from=builder /workspace/backend/node_modules/canvas /app/node_modules/canvas

# Copy built app and necessary runtime files
COPY --from=builder /workspace/backend/dist ./dist
COPY --from=builder /workspace/backend/.env* ./

# Copy public folder if exists (optional)
RUN mkdir -p public

# Copy shared compiled code to node_modules/@shared for runtime resolution
RUN mkdir -p node_modules/@shared
COPY --from=builder /workspace/backend/dist/shared ./node_modules/@shared

RUN mkdir -p uploads

# Expose API port
EXPOSE 5002

# Healthcheck (route is defined at '/health' in src/index.ts)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:5002/health || exit 1

# Start application (compiled entry at dist/backend/src/index.js due to TS include of ../shared)
CMD ["node", "dist/backend/src/index.js"]