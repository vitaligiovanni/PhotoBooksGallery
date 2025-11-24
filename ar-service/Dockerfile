# AR Service Dockerfile
FROM node:18-alpine

# Install dependencies for native modules (sharp, canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Configure npm для лучшей стабильности сети
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Install dependencies with retry logic
RUN npm ci --only=production --prefer-offline || \
    (sleep 10 && npm ci --only=production --prefer-offline) || \
    (sleep 20 && npm install --only=production --no-audit --no-fund)

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create storage directories
RUN mkdir -p /app/storage/ar-storage /app/storage/uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/index.js"]
