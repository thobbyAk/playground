#!/usr/bin/env bash

set -euo pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
stamp="$(date +%Y-%m-%d_%H%M%S)"
target="$BACKUP_DIR/postgres_$stamp.sql.gz"

mkdir -p "$BACKUP_DIR"


# Write to a .partial file first: a crash half way never leaves a truncated
# file that looks like a good backup.
docker exec postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$target.partial"
mv "$target.partial" "$target"

# Also matches leftover .partial files from crashed runs.
find "$BACKUP_DIR" -name 'postgres_*' -mtime "+$KEEP_DAYS" -delete

echo "backup written: $target ($(du -h "$target" | cut -f1))"
