#!/usr/bin/env bash
# Database Backup Script for H1T MICRO
# Creates a timestamped, gzip-compressed logical dump of the nutrition schema.

set -euo pipefail

DB_URL="${DATABASE_URL:-}"
if [ -z "$DB_URL" ]; then
  if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs) || true
    DB_URL="${DATABASE_URL:-}"
  fi
fi

if [ -z "$DB_URL" ]; then
  echo "Error: DATABASE_URL environment variable is required." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump utility not found in PATH. Please install PostgreSQL client tools." >&2
  exit 1
fi

BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${1:-${BACKUP_DIR}/nutrition_backup_${TIMESTAMP}.sql.gz}"

# Mask connection string credentials for console output
MASKED_URL=$(echo "$DB_URL" | sed -E 's/:([^@/]+)@/:***@/g')
echo "Initiating backup for: $MASKED_URL"
echo "Target schema: nutrition"
echo "Output file: $OUTPUT_FILE"

pg_dump "$DB_URL" \
  --schema=nutrition \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip -9 > "$OUTPUT_FILE"

if [ -s "$OUTPUT_FILE" ]; then
  FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
  echo "Backup completed successfully."
  echo "Size: $FILE_SIZE"
  if command -v sha256sum >/dev/null 2>&1; then
    SHA=$(sha256sum "$OUTPUT_FILE" | awk '{print $1}')
    echo "SHA256: $SHA"
  fi
else
  echo "Error: Backup output file is empty." >&2
  rm -f "$OUTPUT_FILE"
  exit 1
fi
