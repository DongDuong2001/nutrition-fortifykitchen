#!/usr/bin/env bash
# Post-deploy smoke test: one PASS/FAIL line per check, exit 1 when any check fails. deploy.sh runs it last and
# never rolls back on its own: a failure is for a person to look at.
#   deploy/smoke.sh                      # reads deploy/.env.prod
#   SMOKE_BASE_URL=https://staging.example deploy/smoke.sh
#
# deploy/.env.prod (add these two lines; the account is a dedicated, otherwise empty smoke account):
#   SMOKE_EMAIL=smoke@...      SMOKE_PASSWORD=...
# Without them the write round trip prints SKIP. SMOKE_ACCESS_TOKEN (a Supabase access token) can replace the
# sign-in, for a test against a local API.
set -uo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$repo_root/deploy/.env.prod"

# A value from the environment, else from deploy/.env.prod (no sourcing: values may hold any character)
setting() {
  local name="$1" value="${!1:-}"
  if [ -z "$value" ] && [ -f "$env_file" ]; then
    value="$(grep -E "^${name}=" "$env_file" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
  fi
  printf '%s' "$value"
}

base="$(setting SMOKE_BASE_URL)"
base="${base:-$(setting NEXT_PUBLIC_SITE_URL)}"
base="${base%/}"
api="$(setting SMOKE_API_URL)"
api="${api:-$base/api/v1}"
supabase="$(setting NEXT_PUBLIC_SUPABASE_URL)"
anon="$(setting NEXT_PUBLIC_SUPABASE_ANON_KEY)"
email="$(setting SMOKE_EMAIL)"
password="$(setting SMOKE_PASSWORD)"
token="$(setting SMOKE_ACCESS_TOKEN)"
want_title="Lê Hồng Khánh · HIT1 Coaching"

if [ -z "$base" ]; then
  echo "FAIL setup: no SMOKE_BASE_URL or NEXT_PUBLIC_SITE_URL" >&2
  exit 1
fi

failed=0
pass() { echo "PASS $1"; }
fail() { echo "FAIL $1${2:+ ($2)}"; failed=1; }
skip() { echo "SKIP $1${2:+ ($2)}"; }
status_of() { curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$@" 2>/dev/null || echo 000; }

echo "==> Smoke test of $base"

# 1. The link page answers with its title
title="$(curl -sS --max-time 20 "$base/" 2>/dev/null | grep -o '<title>[^<]*</title>' | head -1 | sed -e 's/<title>//' -e 's/<\/title>//')"
if [ "$title" = "$want_title" ]; then pass "/ title is \"$want_title\""; else fail "/ title" "got \"$title\""; fi

# 2. Hôm nay and 3. the API health check
code="$(status_of "$base/app")"
if [ "$code" = "200" ]; then pass "/app 200"; else fail "/app" "HTTP $code"; fi
code="$(status_of "$base/healthz")"
if [ "$code" = "200" ]; then pass "/healthz 200"; else fail "/healthz" "HTTP $code"; fi

# 4. The catalogue has foods
foods="$(curl -sS --max-time 20 "$api/foods?limit=1" 2>/dev/null)"
food_id="$(printf '%s' "$foods" | grep -o '"id":"[0-9a-f-]\{36\}"' | head -1 | cut -d'"' -f4)"
if [ -n "$food_id" ]; then pass "GET /api/v1/foods?limit=1 has items"; else fail "GET /api/v1/foods?limit=1" "no items: ${foods:0:160}"; fi

# 5. A write round trip with the smoke account: create a food entry, find it in the day, delete it
if [ -z "$token" ] && { [ -z "$email" ] || [ -z "$password" ]; }; then
  skip "write round trip" "set SMOKE_EMAIL and SMOKE_PASSWORD in deploy/.env.prod"
elif [ -z "$food_id" ]; then
  fail "write round trip" "no food to log"
else
  if [ -z "$token" ]; then
    login="$(curl -sS --max-time 20 -X POST "$supabase/auth/v1/token?grant_type=password" \
      -H "apikey: $anon" -H "Content-Type: application/json" \
      --data "{\"email\":\"$email\",\"password\":\"$password\"}" 2>/dev/null)"
    token="$(printf '%s' "$login" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4)"
  fi
  if [ -z "$token" ]; then
    fail "write round trip" "smoke account sign-in failed"
  else
    day="$(TZ=Asia/Ho_Chi_Minh date +%F)"
    id="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"
    id="$(printf '%s' "$id" | tr 'A-Z' 'a-z')"
    auth=(-H "Authorization: Bearer $token" -H "Content-Type: application/json")
    out="$(mktemp)"
    created="$(curl -sS --max-time 20 -o "$out" -w '%{http_code}' -X POST "$api/days/$day/entries" "${auth[@]}" \
      --data "{\"id\":\"$id\",\"kind\":\"food\",\"meal_slot\":\"snack\",\"food_id\":\"$food_id\",\"grams\":100,\"serving_size_g\":100}" 2>/dev/null || echo 000)"
    body="$(cat "$out")"
    rm -f "$out"
    if [ "$created" != "201" ]; then
      fail "write round trip: create entry" "HTTP $created ${body:0:200}"
    elif ! curl -sS --max-time 20 "$api/days/$day" "${auth[@]}" 2>/dev/null | grep -q "\"$id\""; then
      fail "write round trip: GET /days/$day lists the new entry"
    else
      code="$(status_of -X DELETE "$api/entries/$id" "${auth[@]}")"
      if [ "$code" = "200" ]; then pass "write round trip (create → GET day → delete)"; else fail "write round trip: delete" "HTTP $code"; fi
    fi
  fi
fi

if [ "$failed" -ne 0 ]; then
  echo "==> SMOKE TEST FAILED. Nothing was rolled back: check the lines above, then fix or run deploy/deploy.sh <previous-tag>." >&2
  exit 1
fi
echo "==> Smoke test passed"
