#!/bin/sh
set -e

APP_DIR="/app"
CANVAS_FLAG="$APP_DIR/.canvas_rebuilt"

cd "$APP_DIR"

# Rebuild canvas once per container lifecycle to ensure worker-compatible native bindings
if [ ! -f "$CANVAS_FLAG" ]; then
  echo "[Entrypoint] Rebuilding canvas native module..."
  npm rebuild canvas --verbose || {
    echo "[Entrypoint] WARNING: npm rebuild canvas failed; continuing";
  }
  touch "$CANVAS_FLAG"
  echo "[Entrypoint] Canvas rebuild done."
else
  echo "[Entrypoint] Canvas already rebuilt; skipping."
fi

# Exec node app
exec "$@"
