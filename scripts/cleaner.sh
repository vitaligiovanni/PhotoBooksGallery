#!/bin/sh
set -euo pipefail

DAYS="${CLEAN_OLDER_THAN_DAYS:-3}"
TARGET_DIR="/uploads"

echo "[cleaner] Started. Removing files older than ${DAYS} days from ${TARGET_DIR}"

while true; do
  echo "[cleaner] Scanning ${TARGET_DIR}..."
  # Remove only files, not directories
  find "$TARGET_DIR" -type f -mtime +"$DAYS" -print -delete || true
  echo "[cleaner] Completed. Next run in 24h."
  sleep 86400
done
