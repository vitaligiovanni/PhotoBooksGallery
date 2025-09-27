#!/usr/bin/env bash
set -euo pipefail

# deploy-release.sh
# Универсальный деплой без CI: запускается ЛОКАЛЬНО, собирает артефакт, затем копирует на сервер и активирует релиз.
# Требования: ssh, scp/rsync, bash. На сервере: Node.js LTS, pm2 (или systemd unit), PostgreSQL.

APP_NAME="photobooksgallery"
SERVER_HOST="${SERVER_HOST:-82.202.129.237}"
SERVER_USER="${SERVER_USER:-root}"
REMOTE_BASE="${REMOTE_BASE:-/var/www/$APP_NAME}"
RELEASES_DIR="$REMOTE_BASE/releases"
PERSIST_DIR="$REMOTE_BASE/persistent" # uploads, .env и т.п.
UPLOADS_DIR="$PERSIST_DIR/uploads"
ENV_FILE_REMOTE="$PERSIST_DIR/.env"    # НЕ перезаписываем при деплое
ONLY="${ONLY:-}"                       # server,client,code,public,migrations
PM2_PROCESS="${PM2_PROCESS:-$APP_NAME}" # имя процесса в pm2

# Дополнительные безопасные опции:
# DATABASE_URL    - строка подключения для локальной миграции (не обязательно)
# REMOTE_DB_URL   - если задать, на сервере будет создан bkp перед миграциями
# BACKUP_BEFORE_MIGRATIONS=true  - делать pg_dump (требует psql/pg_dump на сервере)
# HEALTH_URL      - например http://127.0.0.1:3000/api/health (выполняется с сервера после перезапуска)
# HEALTH_TIMEOUT=20  - секунд ожидания успешного health
# AUTO_ROLLBACK=true - если health не ок, откатиться на предыдущий релиз
# SKIP_BUILD=true    - пропустить build (например только миграции)

BACKUP_BEFORE_MIGRATIONS="${BACKUP_BEFORE_MIGRATIONS:-false}"
HEALTH_URL="${HEALTH_URL:-}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-20}"
AUTO_ROLLBACK="${AUTO_ROLLBACK:-false}"
REMOTE_DB_URL="${REMOTE_DB_URL:-}"
SKIP_BUILD="${SKIP_BUILD:-false}"
TELEGRAM_NOTIFY="${TELEGRAM_NOTIFY:-false}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

timestamp() { date +%Y%m%d%H%M%S; }

info() { echo -e "\033[32m[INFO]\033[0m $*"; }
warn() { echo -e "\033[33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[31m[ERR ]\033[0m $*"; }

RELEASE="release-$(timestamp)"
BUILD_DIR=".deploy/$RELEASE"
ARCHIVE="$RELEASE.tar.gz"

# 1. Подготовка
info "Preparing release dir $BUILD_DIR"
rm -rf .deploy
mkdir -p "$BUILD_DIR"

# 2. Build (если не ограничено ONLY)
if [[ "$SKIP_BUILD" == "true" ]]; then
  info "Skipping build (SKIP_BUILD=true)"
elif [[ -z "$ONLY" || "$ONLY" != "migrations" ]]; then
  info "Running build..."
  npm install --omit=dev
  npm run build
fi

# 3. Копируем необходимые директории
copy_dir() {
  local d="$1"; local target="$BUILD_DIR/$d";
  if [[ -d "$d" ]]; then
    mkdir -p "$(dirname "$target")"
    cp -R "$d" "$target"
  fi
}

# Code / shared / dist / public / migrations с учётом ONLY
SELECTED=(dist server shared public migrations package.json package-lock.json deploy-manifest.json)

if [[ -n "$ONLY" ]]; then
  info "Partial deploy mode: ONLY=$ONLY"
  case "$ONLY" in
    code)
      SELECTED=(dist server shared package.json package-lock.json deploy-manifest.json)
      ;;
    server)
      SELECTED=(server shared package.json package-lock.json deploy-manifest.json)
      ;;
    client|public)
      SELECTED=(dist public package.json package-lock.json deploy-manifest.json)
      ;;
    migrations)
      SELECTED=(migrations package.json package-lock.json deploy-manifest.json)
      ;;
    *)
      warn "Неизвестное значение ONLY=$ONLY — будет выполнен полный деплой"
      SELECTED=(dist server shared public migrations package.json package-lock.json deploy-manifest.json)
      ;;
  esac
fi

for d in "${SELECTED[@]}"; do
  if [[ -e "$d" ]]; then copy_dir "$d"; fi
done

# 4. Manifest (если не создан ранее)
if [[ ! -f deploy-manifest.json ]]; then
  node scripts/generate-manifest.mjs --quiet || warn "Manifest generation failed, continuing"
  cp deploy-manifest.json "$BUILD_DIR" || true
fi

# 5. Архивируем
tar -czf "$ARCHIVE" -C .deploy "$RELEASE"
info "Archive created: $ARCHIVE"

# 6. Копируем на сервер
scp "$ARCHIVE" "$SERVER_USER@$SERVER_HOST:/tmp/" 

# 7. Активация на сервере (выполняется через ssh)
ssh "$SERVER_USER@$SERVER_HOST" bash -s <<EOF
set -euo pipefail
APP_NAME="$APP_NAME"
RELEASES_DIR="$RELEASES_DIR"
PERSIST_DIR="$PERSIST_DIR"
UPLOADS_DIR="$UPLOADS_DIR"
ENV_FILE_REMOTE="$ENV_FILE_REMOTE"
RELEASE="$RELEASE"
ARCHIVE="$ARCHIVE"
PM2_PROCESS="$PM2_PROCESS"
ONLY="$ONLY"
BACKUP_BEFORE_MIGRATIONS="$BACKUP_BEFORE_MIGRATIONS"
HEALTH_URL="$HEALTH_URL"
HEALTH_TIMEOUT="$HEALTH_TIMEOUT"
AUTO_ROLLBACK="$AUTO_ROLLBACK"
REMOTE_DB_URL="$REMOTE_DB_URL"
TELEGRAM_NOTIFY="$TELEGRAM_NOTIFY"
TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
TELEGRAM_CHAT_ID="$TELEGRAM_CHAT_ID"

mkdir -p "\$RELEASES_DIR" "\$PERSIST_DIR" "\$UPLOADS_DIR"
if [[ ! -f "\$ENV_FILE_REMOTE" ]]; then
  echo "WARNING: \$ENV_FILE_REMOTE отсутствует. Создайте .env вручную." >&2
fi

cd "\$RELEASES_DIR"
tar -xzf /tmp/"\$ARCHIVE"
rm -f /tmp/"\$ARCHIVE"

# Синхронизируем uploads при необходимости (оставляем ссылку)
if [[ -d "\$RELEASE/uploads" ]]; then
  rm -rf "\$RELEASE/uploads"
fi
ln -sfn "\$UPLOADS_DIR" "\$RELEASE/uploads"

# Устанавливаем зависимости (production)
if [[ -f "\$RELEASE/package.json" ]]; then
  cd "\$RELEASE" && npm install --omit=dev --no-audit --no-fund
fi

# Выполняем миграции, если есть новые (простой вариант)
PREV_RELEASE="$(ls -dt release-* 2>/dev/null | sed -n '2p' || true)"

if [[ -d "\$RELEASE/migrations" && "\$ONLY" != "client" && "\$ONLY" != "public" && "\$ONLY" != "server" ]]; then
  echo "Migrations stage..."
  if [[ "\$BACKUP_BEFORE_MIGRATIONS" == "true" && -n "\$REMOTE_DB_URL" ]]; then
    if command -v pg_dump >/dev/null 2>&1; then
      BKP_FILE="\$PERSIST_DIR/backup_\$(date +%Y%m%d%H%M%S).sql.gz"
      echo "Creating DB backup -> \$BKP_FILE"
      pg_dump "\$REMOTE_DB_URL" | gzip > "\$BKP_FILE" || echo "Backup failed (continuing)"
    else
      echo "pg_dump not found. Skipping DB backup"
    fi
  fi
  echo "Applying migrations (drizzle push)..."
  if command -v npx >/dev/null 2>&1; then
    if ! npx drizzle-kit push; then
      echo "Migrations failed"
      exit 17
    fi
  else
    echo "npx не найден, пропуск миграций"
  fi
else
  echo "Skipping migrations (mode ONLY=\$ONLY)"
fi

# Переключаем симлинк
ln -sfn "\$RELEASES_DIR/\$RELEASE" "\$RELEASES_DIR/current"

# Перезапуск через pm2
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list | grep -q "\$PM2_PROCESS"; then
    pm2 restart "\$PM2_PROCESS"
  else
    pm2 start dist/server/index.js --name "\$PM2_PROCESS" --time || pm2 start server/index.js --name "\$PM2_PROCESS" --time || true
  fi
  pm2 save || true
else
  echo "pm2 не установлен. Запустите процесс вручную." >&2
fi

ROLLBACK_PERFORMED=false

echo "Release \$RELEASE deployed (pre-health)."

if [[ -n "\$HEALTH_URL" ]]; then
  echo "Health check: \$HEALTH_URL (timeout \$HEALTH_TIMEOUT s)"
  success=false
  for i in $(seq 1 "\$HEALTH_TIMEOUT"); do
    STATUS="$(curl -s -o /dev/null -w '%{http_code}' "\$HEALTH_URL" || true)"
    if [[ "\$STATUS" == "200" ]]; then
      echo "Health OK (status 200)"
      success=true
      break
    fi
    sleep 1
  done
  if [[ "\$success" != true ]]; then
    echo "Health failed. Status last=\$STATUS"
    if [[ "\$AUTO_ROLLBACK" == "true" && -n "\$PREV_RELEASE" ]]; then
      echo "AUTO_ROLLBACK enabled. Rolling back to \$PREV_RELEASE"
      ln -sfn "\$RELEASES_DIR/\$PREV_RELEASE" "\$RELEASES_DIR/current"
      if command -v pm2 >/dev/null 2>&1; then
        pm2 restart "\$PM2_PROCESS" || true
      fi
      ROLLBACK_PERFORMED=true
    fi
  fi
fi

if [[ "\$ROLLBACK_PERFORMED" == true ]]; then
  echo "Rollback executed due to failed health."
  if [[ "\$TELEGRAM_NOTIFY" == "true" && -n "\$TELEGRAM_BOT_TOKEN" && -n "\$TELEGRAM_CHAT_ID" ]]; then
    curl -s -X POST "https://api.telegram.org/bot\$TELEGRAM_BOT_TOKEN/sendMessage" \
      -d chat_id="\$TELEGRAM_CHAT_ID" \
      -d text="[DEPLOY][FAIL+ROLLBACK] \$APP_NAME release \$RELEASE health failed -> rolled back" >/dev/null || true
  fi
else
  echo "Release \$RELEASE active."
  if [[ "\$TELEGRAM_NOTIFY" == "true" && -n "\$TELEGRAM_BOT_TOKEN" && -n "\$TELEGRAM_CHAT_ID" ]]; then
    curl -s -X POST "https://api.telegram.org/bot\$TELEGRAM_BOT_TOKEN/sendMessage" \
      -d chat_id="\$TELEGRAM_CHAT_ID" \
      -d text="[DEPLOY][OK] \$APP_NAME release \$RELEASE deployed (ONLY=\$ONLY)" >/dev/null || true
  fi
fi
EOF

info "Deployment complete. Current release: $RELEASE"
