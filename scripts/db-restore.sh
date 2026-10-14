#!/usr/bin/env bash
# Database Restore Script for H1T MICRO
# Restores a gzip-compressed logical dump to the database specified by DATABASE_URL.

set -euo pipefail

BACKUP_FILE="${1:-}"
FORCE="${2:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <path-to-backup-file.sql.gz> [--yes]" >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found at: $BACKUP_FILE" >&2
  exit 1
fi

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

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql utility not found in PATH. Please install PostgreSQL client tools." >&2
  exit 1
fi

MASKED_URL=$(echo "$DB_URL" | sed -E 's/:([^@/]+)@/:***@/g')
echo "WARNING: Restoring will overwrite existing data in the target schema on:"
echo "Target: $MASKED_URL"
echo "Source: $BACKUP_FILE"

if [ "$FORCE" != "--yes" ] && [ "$FORCE" != "-y" ]; then
  read -p "Are you sure you want to proceed with restoration? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Restoration cancelled by user."
    exit 0
  fi
fi

echo "Applying backup to target database..."
gunzip -c "$BACKUP_FILE" | psql "$DB_URL"

echo "Database restoration completed successfully."
