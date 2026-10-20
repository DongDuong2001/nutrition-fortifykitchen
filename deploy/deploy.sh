#!/usr/bin/env bash
# Deploy (or roll back) the production stack. Run as the deploy user on the VPS,
# from the repo checkout:
#   deploy/deploy.sh                  # latest main
#   deploy/deploy.sh 1a2b3c4          # a commit of main (rollback: an older one, nothing is rebuilt)
#   deploy/deploy.sh v1.2.0 --build   # build on this server instead (a ref with no image in the registry)
# Without --build the web and API images of that commit are pulled from ghcr.io (.github/workflows/images.yml
# builds one per push to main); a commit without images stops with a message, it never builds silently.
set -euo pipefail

# Everything lives in main() so bash parses the whole script before checkout
# can swap this file for another version mid-run.
main() {
  local ref="main" build=0 arg
  for arg in "$@"; do
    case "$arg" in
      --build) build=1 ;;
      *) ref="$arg" ;;
    esac
  done
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

  # The images of exactly this commit
  export IMAGE_TAG
  IMAGE_TAG="$(git rev-parse HEAD)"
  if [ "$build" -eq 1 ]; then
    echo "==> Building on this server and starting (IMAGE_TAG $IMAGE_TAG)"
    "${compose[@]}" up -d --build
  else
    echo "==> Pulling the images of $IMAGE_TAG"
    if ! "${compose[@]}" pull web api; then
      echo "No images for $IMAGE_TAG in ghcr.io (not a commit of main, or the Images workflow has not finished)." >&2
      echo "Wait for the workflow, or build here: deploy/deploy.sh $ref --build" >&2
      exit 1
    fi
    echo "==> Starting"
    "${compose[@]}" up -d --no-build
  fi

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

  # Every deploy builds on this VPS: BuildKit's cache and the old images pile up (about 1.5 GB per deploy). Only
  # unused images and cache are removed, never a volume; the running containers and their images stay.
  echo "==> Disk before cleanup"
  docker system df
  echo "==> Pruning build cache older than 3 days and unused images older than 7 days"
  docker builder prune -f --filter until=72h || echo "Builder prune failed (deploy is fine)." >&2
  docker image prune -af --filter until=168h || echo "Image prune failed (deploy is fine)." >&2
  echo "==> Disk after cleanup"
  docker system df

  # Last: the site, the API and a write round trip as a user. A failure exits non-zero and rolls nothing back.
  if ! deploy/smoke.sh; then
    echo "==> Deployed $ref at $(git rev-parse --short HEAD), but the SMOKE TEST FAILED (see above)." >&2
    exit 1
  fi

  echo "==> Deployed $ref at $(git rev-parse --short HEAD)"
}

main "$@"
exit 0
