# AR Service Dockerfile - Multi-stage build with node:20-slim (Debian/glibc)
# This ensures canvas prebuilt binaries work correctly

# ========== BUILDER STAGE ==========
FROM node:20-slim AS builder

# Install build dependencies for canvas (Debian packages)
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

WORKDIR /app

# Copy package files
COPY ar-service/package*.json ./

# Configure npm for network stability
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Install ALL dependencies (including devDependencies for build)
RUN npm ci || \
    (sleep 10 && npm ci) || \
    (sleep 20 && npm install --no-audit --no-fund)

# Copy source code
COPY ar-service/src ./src
COPY ar-service/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Create migrations folder
RUN mkdir -p ./dist/migrations

# Verify canvas works in builder
RUN node -e "const c = require('canvas'); console.log('✅ Canvas works in builder:', typeof c.createCanvas)"

# ========== RUNTIME STAGE ==========
FROM node:20-slim AS runtime

# Install ONLY runtime libraries for canvas (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgif7 \
    libpixman-1-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies
COPY ar-service/package*.json ./
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev --ignore-scripts

# Copy canvas module with prebuilt binaries from builder
COPY --from=builder /app/node_modules/canvas /app/node_modules/canvas

# Copy built application
COPY --from=builder /app/dist ./dist

# Create storage directories
RUN mkdir -p /app/storage/ar-storage /app/storage/uploads /app/objects

# Verify canvas works in runtime
RUN node -e "const c = require('canvas'); console.log('✅ Canvas works in runtime:', typeof c.createCanvas)"

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service directly (no entrypoint needed - canvas already works)
CMD ["node", "dist/index.js"]
