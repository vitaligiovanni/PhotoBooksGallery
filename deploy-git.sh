#!/usr/bin/env bash
# deploy-git.sh - Git-based deployment script for Beget server
# This script should be placed in /var/www/photobooksgallery/ on the server

set -euo pipefail

APP_NAME="photobooksgallery"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="$APP_DIR/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$APP_DIR/deploy.log"
}

log "=== Starting Git deployment ==="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Create backup of current state (if not first deploy)
if [[ -f "$APP_DIR/package.json" ]]; then
    log "Creating backup of current version..."
    tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" \
        --exclude='node_modules' \
        --exclude='backups' \
        --exclude='*.log' \
        --exclude='.git' \
        -C "$APP_DIR" . || log "Backup failed (continuing)"
fi

# Step 2: Pull latest changes from Git
log "Pulling latest changes from Git..."
cd "$APP_DIR"
git pull origin main || {
    log "ERROR: Git pull failed"
    exit 1
}

# Step 3: Install/update dependencies
if [[ -f "package.json" ]]; then
    log "Installing dependencies..."
    npm install --omit=dev --no-audit --no-fund || {
        log "ERROR: npm install failed"
        exit 1
    }
fi

# Step 4: Build project (if build script exists and dist doesn't exist)
if [[ ! -d "dist" && $(npm run | grep -q "build") ]]; then
    log "Building project on server..."
    npm run build || {
        log "ERROR: Build failed"
        exit 1
    }
fi

# Step 5: Run database migrations (if they exist)
if [[ -d "migrations" && -f "drizzle.config.ts" ]]; then
    log "Running database migrations..."
    if command -v npx >/dev/null 2>&1; then
        npx drizzle-kit push || log "Migration failed (continuing)"
    fi
fi

# Step 6: Set up symlinks for uploads (preserve user uploads)
if [[ ! -L "uploads" && -d "/var/www/$APP_NAME-data/uploads" ]]; then
    log "Setting up uploads symlink..."
    rm -rf uploads 2>/dev/null || true
    ln -sf "/var/www/$APP_NAME-data/uploads" uploads
fi

# Step 7: Restart application
if command -v pm2 >/dev/null 2>&1; then
    log "Restarting application with PM2..."
    if pm2 list | grep -q "$APP_NAME"; then
        pm2 restart "$APP_NAME" || pm2 reload "$APP_NAME" || {
            log "PM2 restart failed, trying fresh start..."
            pm2 delete "$APP_NAME" 2>/dev/null || true
            pm2 start dist/server/index.js --name "$APP_NAME" --time
        }
    else
        log "Starting new PM2 process..."
        pm2 start dist/server/index.js --name "$APP_NAME" --time
    fi
    pm2 save
else
    log "PM2 not found. Please start the application manually:"
    log "  cd $APP_DIR && node dist/server/index.js"
fi

# Step 8: Clean old backups (keep last 5)
log "Cleaning old backups..."
cd "$BACKUP_DIR"
ls -t backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f || true

# Step 9: Health check
log "Performing health check..."
sleep 3  # Give app time to start
for i in {1..10}; do
    if curl -s -f http://127.0.0.1:3000/ >/dev/null; then
        log "✅ Application is responding correctly"
        break
    elif [[ $i -eq 10 ]]; then
        log "⚠️  Application may not be responding correctly"
    else
        sleep 2
    fi
done

log "=== Git deployment completed successfully ==="
log "Current commit: $(git rev-parse --short HEAD) - $(git log -1 --pretty=%B | head -n1)"