#!/bin/sh
set -e

echo "[entrypoint] Starting container..."

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint][FATAL] DATABASE_URL not set" >&2
  exit 1
fi

if [ "$SKIP_MIGRATIONS" = "1" ]; then
  echo "[entrypoint] SKIP_MIGRATIONS=1 -> пропускаю применение миграций"
else
  if [ "$USE_PUSH" = "1" ]; then
    echo "[entrypoint] USE_PUSH=1 -> Использую drizzle-kit push (DEV режим)"
    npx drizzle-kit push || { echo "[entrypoint][ERROR] push failed"; exit 2; }
  else
    echo "[entrypoint] Applying migrations (drizzle-kit migrate)..."
    npx drizzle-kit migrate || { echo "[entrypoint][ERROR] migrate failed"; exit 2; }
  fi
fi

echo "[entrypoint] Running predeploy verification (hash + encoding)…"
# Не прерываем старт, если проверка выдаёт предупреждения
npx tsx scripts/predeploy-verify.ts || echo "[entrypoint] predeploy verify returned non-zero (will continue)"

echo "[entrypoint] Starting application"
exec npx tsx server/index.ts
