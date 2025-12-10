# Frontend Dockerfile (multi-stage)
FROM node:20-alpine as builder

# Аргумент для передачи API URL во время сборки
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

# Build with monorepo workspaces so shared deps are available during TS build
WORKDIR /workspace

# Install canvas build dependencies (required by workspace deps)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    pkgconf

# Configure npm для лучшей стабильности сети
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Copy only package manifests first for better layer caching
COPY package.json ./
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install all workspace dependencies with retry logic and cache
RUN npm install --no-audit --no-fund --prefer-offline || \
    (sleep 10 && npm install --no-audit --no-fund --prefer-offline) || \
    (sleep 20 && npm install --no-audit --no-fund)

# Copy source code
COPY frontend ./frontend
COPY shared ./shared

# Build the frontend without prerender (safer in CI/containers)
WORKDIR /workspace/frontend
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /workspace/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Nginx listens on 80 in this image
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]