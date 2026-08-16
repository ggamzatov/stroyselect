#!/usr/bin/env bash
set -euo pipefail

FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "Usage: bash scripts/db-restore.sh <backup.dump>" >&2
  exit 2
fi

if [[ "${ALLOW_DATABASE_RESTORE:-}" != "YES" ]]; then
  echo "Refusing restore. Set ALLOW_DATABASE_RESTORE=YES explicitly." >&2
  exit 3
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname "$DATABASE_URL" "$FILE"
else
  CONTAINER="${POSTGRES_CONTAINER:-stroyselect-postgres}"
  DB="${POSTGRES_DB:-stroyselect}"
  USER="${POSTGRES_USER:-postgres}"
  docker cp "$FILE" "$CONTAINER:/tmp/stroyselect-restore.dump"
  docker exec "$CONTAINER" pg_restore \
    --clean --if-exists --no-owner --no-privileges --exit-on-error \
    -U "$USER" -d "$DB" /tmp/stroyselect-restore.dump
  docker exec "$CONTAINER" rm -f /tmp/stroyselect-restore.dump
fi

echo "Restore completed from: $FILE"
