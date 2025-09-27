#!/usr/bin/env bash
set -euo pipefail

# rollback-release.sh
# Откат к предыдущему релизу: находит второй по свежести release-* и переключает current

APP_NAME="photobooksgallery"
SERVER_HOST="${SERVER_HOST:-82.202.129.237}"
SERVER_USER="${SERVER_USER:-root}"
REMOTE_BASE="${REMOTE_BASE:-/var/www/$APP_NAME}"
RELEASES_DIR="$REMOTE_BASE/releases"

ssh "$SERVER_USER@$SERVER_HOST" bash -s <<'EOF'
set -euo pipefail
RELEASES_DIR="${RELEASES_DIR}"
cd "$RELEASES_DIR"
latest=$(ls -dt release-* 2>/dev/null | head -n1 || true)
second=$(ls -dt release-* 2>/dev/null | sed -n '2p' || true)
if [[ -z "$second" ]]; then
  echo "Нет предыдущего релиза для отката" >&2
  exit 1
fi
ln -sfn "$RELEASES_DIR/$second" "$RELEASES_DIR/current"
echo "Текущий релиз переключен на: $second (было: $latest)"
EOF

echo "Rollback done."
