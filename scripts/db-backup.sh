#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/stroyselect-$STAMP.dump"

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "$OUT"
else
  CONTAINER="${POSTGRES_CONTAINER:-stroyselect-postgres}"
  DB="${POSTGRES_DB:-stroyselect}"
  USER="${POSTGRES_USER:-postgres}"
  docker exec "$CONTAINER" pg_dump --format=custom --no-owner --no-privileges -U "$USER" -d "$DB" > "$OUT"
fi

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$OUT" > "$OUT.sha256"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUT" > "$OUT.sha256"
fi

echo "Backup created: $OUT"
echo "Verify restore regularly; an untested backup is not a backup."
