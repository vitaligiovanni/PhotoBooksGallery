# AR Service Dockerfile
FROM node:18-alpine

# Install dependencies for native modules (sharp, canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    libpng-dev \
    freetype-dev \
    pixman \
    ffmpeg

# Create app directory
WORKDIR /app

# Copy package files from ar-service subfolder (context is project root)
COPY ar-service/package*.json ./

# Configure npm для лучшей стабильности сети
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --prefer-offline || \
    (sleep 10 && npm ci --prefer-offline) || \
    (sleep 20 && npm install --no-audit --no-fund)

# Copy ar-service source code ONLY (from ar-service subfolder)
COPY ar-service/src ./src
COPY ar-service/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Ensure native modules (canvas) are built against current Node AFTER build
RUN npm rebuild canvas --verbose

# Create migrations folder and copy SQL if exists (optional step)
RUN mkdir -p ./dist/migrations

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Create storage directories
RUN mkdir -p /app/storage/ar-storage /app/storage/uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/index.js"]
