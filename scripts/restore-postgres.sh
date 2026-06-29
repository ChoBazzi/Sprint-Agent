#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: npm run db:restore -- backups/jobprep-YYYYMMDD-HHMMSS.dump" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

echo "Restoring PostgreSQL backup: $BACKUP_FILE" >&2
docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  pg_restore -U jobprep -d jobprep --clean --if-exists --no-owner --no-acl < "$BACKUP_FILE"

echo "Restore complete." >&2
