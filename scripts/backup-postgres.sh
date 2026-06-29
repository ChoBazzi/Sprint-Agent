#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
OUTPUT_FILE="$BACKUP_DIR/jobprep-$TIMESTAMP.dump"

mkdir -p "$BACKUP_DIR"

echo "Creating PostgreSQL backup: $OUTPUT_FILE" >&2
docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U jobprep -d jobprep --format=custom --no-owner --no-acl > "$OUTPUT_FILE"

echo "$OUTPUT_FILE"
