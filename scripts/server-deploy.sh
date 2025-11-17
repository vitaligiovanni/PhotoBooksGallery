#!/bin/sh
set -euo pipefail

# Photobooks deployment script (can be placed at /root/deploy.sh)
# - Logs to /root/deploy.log
# - Updates repo, builds, deploys (Docker by default; supports bare/pm2 fallback)
# - Keeps only ONE latest backup (backup-latest.tar.gz)
# - Can append provided PUBKEY to ~/.ssh/authorized_keys if missing

LOGFILE=/root/deploy.log
mkdir -p "$(dirname "$LOGFILE")"
exec > >(tee -a "$LOGFILE") 2>&1
echo "===== $(date -u "+%Y-%m-%dT%H:%M:%SZ") START deploy ====="

# Configurable vars (override via environment before running)
REPO_URL=${REPO_URL:-https://github.com/YOUR_ORG/photobooksgallery.git}
BRANCH=${BRANCH:-main}
APP_DIR=${APP_DIR:-/opt/photobooksgallery}
WWW_DIR=${WWW_DIR:-/var/www/photobooksgallery}
DEPLOY_MODE=${DEPLOY_MODE:-docker}  # docker | bare

# Optional for SSH key append
PUBKEY=${PUBKEY:-}

ensure_ssh_key() {
  if [ -n "$PUBKEY" ]; then
    mkdir -p ~/.ssh && touch ~/.ssh/authorized_keys
    chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys
    if ! grep -q "$(printf %s "$PUBKEY" | awk '{print $2}')" ~/.ssh/authorized_keys; then
      echo "$PUBKEY" >> ~/.ssh/authorized_keys
      echo "[deploy] Public key appended to ~/.ssh/authorized_keys"
    else
      echo "[deploy] Public key already present in ~/.ssh/authorized_keys"
    fi
  fi
}

ensure_prereqs() {
  echo "[deploy] Ensuring base packages..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y >/dev/null 2>&1 || true
  apt-get install -y ca-certificates curl gnupg git unzip >/dev/null 2>&1 || true
}

ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[deploy] Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker || true
  fi
}

clone_or_update_repo() {
  echo "[deploy] Syncing repository $REPO_URL ($BRANCH) into $APP_DIR..."
  mkdir -p "$APP_DIR"
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch --all --prune
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" reset --hard "origin/$BRANCH"
  else
    rm -rf "$APP_DIR"/* 2>/dev/null || true
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  fi
}

backup_latest() {
  echo "[deploy] Creating single latest backup..."
  cd "$APP_DIR"
  mkdir -p backups
  # Prefer dockerized backup if compose is present
  if command -v docker >/dev/null 2>&1 && [ -f docker-compose.yml ]; then
    docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backup || true
  else
    # Minimal fallback: archive current web root and uploads if present
    TMP_DIR=$APP_DIR/backups/.tmp
    mkdir -p "$TMP_DIR"
    STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
    ARCHIVE_TMP="$TMP_DIR/backup-$STAMP.tar.gz"
    ARCHIVE_FINAL="$APP_DIR/backups/backup-latest.tar.gz"
    echo "[deploy] Building archive (fallback mode)..."
    tar -czf "$ARCHIVE_TMP" \
      --transform='s,^,photobooks-backup/,' \
      -C "/" $( [ -d "$WWW_DIR" ] && echo "${WWW_DIR#/}" ) $( [ -d "$APP_DIR/uploads" ] && echo "${APP_DIR#/}/uploads" ) 2>/dev/null || true
    mv -f "$ARCHIVE_TMP" "$ARCHIVE_FINAL" || true
    rmdir "$TMP_DIR" 2>/dev/null || true
    ls -lh "$ARCHIVE_FINAL" 2>/dev/null || true
  fi
}

deploy_docker() {
  echo "[deploy] Docker mode..."
  ensure_docker
  cd "$APP_DIR"
  docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  echo "[deploy] Checking backend health..."
  sleep 2
  if curl -fsS http://localhost:5002/api/health >/dev/null 2>&1; then
    echo "[deploy] Backend healthy"
  else
    echo "[deploy] WARN: Backend healthcheck failed"
  fi
}

deploy_bare_pm2() {
  echo "[deploy] Bare/PM2 mode..."
  apt-get update -y >/dev/null 2>&1 || true
  apt-get install -y nodejs npm nginx >/dev/null 2>&1 || true
  if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2 --omit=dev --no-audit --loglevel=error || true
  fi

  cd "$APP_DIR/shared"
  npm ci --no-audit --loglevel=error || npm install --no-audit --no-fund

  cd "$APP_DIR/backend"
  npm ci --no-audit --loglevel=error || npm install --no-audit --no-fund
  npm run build
  npm ci --omit=dev --no-audit --loglevel=error || true

  cd "$APP_DIR/frontend"
  npm ci --no-audit --loglevel=error || npm install --no-audit --no-fund
  npm run build

  mkdir -p "$WWW_DIR"
  rsync -a --delete "$APP_DIR/frontend/dist/" "$WWW_DIR/"

  # Start/Restart backend with PM2
  cd "$APP_DIR"
  pm2 start "backend/dist/backend/src/index.js" --name photobooksgallery --update-env || pm2 restart photobooksgallery
  pm2 save || true
  systemctl restart nginx || true
}

main() {
  ensure_ssh_key
  ensure_prereqs
  clone_or_update_repo
  backup_latest
  if [ "$DEPLOY_MODE" = "docker" ]; then
    deploy_docker
  else
    deploy_bare_pm2
  fi
  echo "[deploy] DONE"
}

main "$@"
echo "===== $(date -u "+%Y-%m-%dT%H:%M:%SZ") END deploy ====="
