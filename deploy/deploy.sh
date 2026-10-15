#!/usr/bin/env bash
# Deploy (or roll back) the production stack. Run as the deploy user on the VPS,
# from the repo checkout:
#   deploy/deploy.sh            # latest main
#   deploy/deploy.sh v1.2.0     # a tag, branch or commit (rollback)
set -euo pipefail

# Everything lives in main() so bash parses the whole script before checkout
# can swap this file for another version mid-run.
main() {
  local ref="${1:-main}"
  local repo_root compose_file env_file
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  compose_file="deploy/docker-compose.prod.yml"
  env_file="deploy/.env.prod"
  local -a compose=(docker compose -f "$compose_file" --env-file "$env_file")

  cd "$repo_root"

  if [ ! -f "$env_file" ]; then
    echo "Missing $env_file. Copy deploy/.env.prod.example and fill it in." >&2
    exit 1
  fi
  if [ "$(stat -c '%a' "$env_file")" != "600" ]; then
    echo "Warning: $env_file should be chmod 600." >&2
  fi

  echo "==> Fetching $ref"
  git fetch --tags --prune origin
  if git show-ref --verify --quiet "refs/remotes/origin/$ref"; then
    git checkout "$ref"
    git pull --ff-only origin "$ref"
  else
    git checkout --detach "$ref"
  fi
  echo "==> At $(git rev-parse --short HEAD) ($(git describe --tags --always))"

  echo "==> Building and starting"
  "${compose[@]}" up -d --build

  echo "==> Waiting for health (up to 180 s)"
  local deadline=$((SECONDS + 180))
  local svc status all_ok
  while :; do
    all_ok=1
    for svc in web api caddy; do
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
        "$("${compose[@]}" ps -q "$svc")" 2>/dev/null || echo missing)"
      [ "$status" = "healthy" ] || all_ok=0
    done
    [ "$all_ok" -eq 1 ] && break
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "Services did not become healthy in time." >&2
      "${compose[@]}" ps
      "${compose[@]}" logs --tail 40
      exit 1
    fi
    sleep 5
  done

  echo "==> Container status"
  "${compose[@]}" ps

  echo "==> Pruning unused images"
  docker image prune -f

  echo "==> Deployed $ref at $(git rev-parse --short HEAD)"
}

main "$@"
exit 0
