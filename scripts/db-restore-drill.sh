#!/usr/bin/env bash
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-stroyselect-postgres}"
SOURCE_DB="${POSTGRES_DB:-stroyselect}"
USER="${POSTGRES_USER:-postgres}"
DRILL_DB="${RESTORE_DRILL_DB:-stroyselect_restore_drill}"
BACKUP_DIR="${BACKUP_DIR:-./backups/postgres-drill}"

if [[ "$DRILL_DB" == "$SOURCE_DB" ]]; then
  echo "Refusing to use source database as restore drill target" >&2
  exit 1
fi

cleanup() {
  docker exec "$CONTAINER" psql -U "$USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DRILL_DB' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
  docker exec "$CONTAINER" dropdb -U "$USER" --if-exists "$DRILL_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$BACKUP_DIR" POSTGRES_CONTAINER="$CONTAINER" POSTGRES_DB="$SOURCE_DB" POSTGRES_USER="$USER" bash scripts/db-backup.sh
LATEST="$(ls -1t "$BACKUP_DIR"/*.dump | head -n 1)"

cleanup

docker exec "$CONTAINER" createdb -U "$USER" "$DRILL_DB"
docker exec -i "$CONTAINER" pg_restore \
  -U "$USER" -d "$DRILL_DB" --no-owner --no-privileges --exit-on-error < "$LATEST"

CHECK="$(docker exec "$CONTAINER" psql -U "$USER" -d "$DRILL_DB" -At -v ON_ERROR_STOP=1 -c "
SELECT CASE WHEN
  to_regclass('public.users') IS NOT NULL AND
  to_regclass('public.projects') IS NOT NULL AND
  to_regclass('public.contractor_companies') IS NOT NULL AND
  to_regclass('public.project_payments') IS NOT NULL AND
  to_regclass('public.application_errors') IS NOT NULL
THEN 'ok' ELSE 'missing' END;
")"

if [[ "$CHECK" != "ok" ]]; then
  echo "Restore drill failed: required tables are missing" >&2
  exit 1
fi

SOURCE_PROJECTS="$(docker exec "$CONTAINER" psql -U "$USER" -d "$SOURCE_DB" -At -c "SELECT count(*) FROM public.projects")"
DRILL_PROJECTS="$(docker exec "$CONTAINER" psql -U "$USER" -d "$DRILL_DB" -At -c "SELECT count(*) FROM public.projects")"

if [[ "$SOURCE_PROJECTS" != "$DRILL_PROJECTS" ]]; then
  echo "Restore drill failed: project count mismatch ($SOURCE_PROJECTS != $DRILL_PROJECTS)" >&2
  exit 1
fi

echo "Restore drill passed: $LATEST -> $DRILL_DB"
echo "Verified required tables and project row count: $DRILL_PROJECTS"
