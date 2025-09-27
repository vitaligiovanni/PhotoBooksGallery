#!/usr/bin/env bash
set -euo pipefail

SERVICE=photobooksgallery.service
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

install -Dm644 "$SRC_DIR/photobooksgallery.service" /etc/systemd/system/photobooksgallery.service
mkdir -p /var/www/photobooksgallery/persistent/logs
chown -R www-data:www-data /var/www/photobooksgallery/persistent/logs || true
systemctl daemon-reload
systemctl enable photobooksgallery.service
systemctl restart photobooksgallery.service || systemctl start photobooksgallery.service
echo "Systemd service deployed. Check: systemctl status photobooksgallery.service"