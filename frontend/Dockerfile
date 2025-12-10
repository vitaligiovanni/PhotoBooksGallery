# Frontend Dockerfile (multi-stage)
FROM node:20-alpine AS builder

# Аргумент для передачи API URL во время сборки
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

# Build frontend independently (no need for backend deps)
WORKDIR /workspace

# Configure npm для лучшей стабильности сети
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

# Copy only frontend and shared package manifests (NOT backend - avoid canvas!)
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/

# Install frontend deps only (no workspaces, no backend)
WORKDIR /workspace/frontend
RUN npm install --no-audit --no-fund || \
    (sleep 10 && npm install --no-audit --no-fund) || \
    (sleep 20 && npm install --no-audit --no-fund)

# Install shared deps
WORKDIR /workspace/shared
RUN npm install --no-audit --no-fund || \
    (sleep 10 && npm install --no-audit --no-fund)

# Copy source code
WORKDIR /workspace
COPY frontend ./frontend
COPY shared ./shared

# Build the frontend
WORKDIR /workspace/frontend
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /workspace/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Nginx listens on 80 in this image
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]