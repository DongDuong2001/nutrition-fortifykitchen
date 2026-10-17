#!/usr/bin/env bash
# The API integration tests (go test -tags=integration) against a throwaway Postgres 17 with every migration
# applied in order. A migration that fails stops the run. Extra arguments go to go test (default ./...).
# With TEST_DATABASE_URL already set (CI's service container, or a local server) that empty database is used
# instead of docker compose, and psql must be on the PATH.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "${TEST_DATABASE_URL:-}" ]; then
  sql() { psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -q; }
else
  compose=(docker compose -p nutrition-api-test -f docker-compose.test.yml)
  trap '"${compose[@]}" down -v >/dev/null 2>&1 || true' EXIT
  "${compose[@]}" up -d --wait
  sql() { "${compose[@]}" exec -T db psql -v ON_ERROR_STOP=1 -q -U postgres -d nutrition_test; }
  export TEST_DATABASE_URL="postgres://postgres:postgres@127.0.0.1:55432/nutrition_test?sslmode=disable"
fi

sql < testdata/supabase_shim.sql
for f in ../../migrations/*.up.sql; do
  echo "migrate: $(basename "$f")"
  sql < "$f"
done

if [ "$#" -eq 0 ]; then set -- ./...; fi
go test -tags=integration -count=1 "$@"
