#!/usr/bin/env bash
# cc-50 guard for cc-48: "/" must be the coach link page. Checks a `next build` log (plain, or docker --progress=plain)
# for the route line "┌ ƒ /" (a static "┌ ○ /" was the broken build) and the root page's client reference manifest
# for components/link-page. Usage: check-root-page.sh <build-log> <.next/server/app/page_client-reference-manifest.js>
set -uo pipefail
log="$1" manifest="$2" failed=0

if grep -qE '┌ ƒ /[[:space:]]*$' "$log"; then
  echo "PASS route table: ┌ ƒ /"
else
  echo "FAIL route table has no '┌ ƒ /' line: $(grep -E '┌ ' "$log" | head -1)"
  failed=1
fi
if grep -q 'components/link-page' "$manifest"; then
  echo "PASS root page manifest has components/link-page"
else
  echo "FAIL root page manifest has no components/link-page"
  failed=1
fi
exit "$failed"
