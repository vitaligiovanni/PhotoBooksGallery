#!/bin/sh
set -euo pipefail

# Runs docker system prune -af --volumes weekly (Sunday) using host docker socket.
# Requires /var/run/docker.sock mounted and "docker" CLI in the container.

while true; do
  DOW=$(date +%u) # 1..7 (Mon..Sun)
  if [ "$DOW" = "7" ]; then
    echo "[pruner] Running weekly docker system prune..."
    docker system prune -af --volumes || true
    echo "[pruner] Done. Next run in 7 days."
    sleep 604800
  else
    # Sleep until next day
    echo "[pruner] Not Sunday (DoW=$DOW). Sleeping 24h."
    sleep 86400
  fi
done
