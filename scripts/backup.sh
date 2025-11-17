#!/bin/sh
set -euo pipefail

# This script creates a single archive backups/backup-latest.tar.gz containing:
# - PostgreSQL dump (SQL)
# - uploads directory
# It overwrites the previous backup atomically.

BACKUP_DIR=/backups
UPLOADS_DIR=/uploads
TMP_DIR=${BACKUP_DIR}/.tmp
STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
ARCHIVE_TMP=${TMP_DIR}/backup-${STAMP}.tar.gz
ARCHIVE_FINAL=${BACKUP_DIR}/backup-latest.tar.gz

mkdir -p "${BACKUP_DIR}" "${TMP_DIR}"

# Verify required envs for pg_dump
: "${PGHOST:?PGHOST is required}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"

SQL_DUMP=${TMP_DIR}/db-${STAMP}.sql

echo "[backup] Creating PostgreSQL dump..."
pg_dump -h "$PGHOST" -U "$PGUSER" "$PGDATABASE" > "$SQL_DUMP"

# Build tar.gz with db dump and uploads
# Avoid including previous backups inside archive
echo "[backup] Creating archive..."
# Use --transform to place files under a root directory in the archive
(
  cd / || exit 1
  tar -czf "$ARCHIVE_TMP" \
    --transform='s,^,photobooks-backup/,' \
    "${SQL_DUMP#/}" \
    "${UPLOADS_DIR#/}"
)

# Atomic move to final name
mv -f "$ARCHIVE_TMP" "$ARCHIVE_FINAL"

# Cleanup tmp files
rm -f "$SQL_DUMP"
rmdir "$TMP_DIR" 2>/dev/null || true

ls -lh "$ARCHIVE_FINAL"
echo "[backup] Done: $ARCHIVE_FINAL"
