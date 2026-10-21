#!/usr/bin/env bash
# Deploy (or roll back) the production stack. Run as the deploy user on the VPS,
# from the repo checkout:
#   deploy/deploy.sh                  # latest main
#   deploy/deploy.sh 1a2b3c4          # a commit of main (rollback to it: nothing is rebuilt)
#   deploy/deploy.sh v1.2.0 --build   # build on this server instead (a ref with no image in the registry)
#   deploy/deploy.sh --rollback       # back to the images that ran before the last deploy, in seconds
# Without --build the web and API images of that commit are pulled from ghcr.io (.github/workflows/images.yml
# builds one per push to main); a commit without images stops with a message, it never builds silently.
# The tag that runs is kept in deploy/.image-tag (IMAGE_TAG, and PREV_IMAGE_TAG for --rollback): compose reads it,
# so a manual `docker compose … up` starts the same images, never another version.
set -euo pipefail

# Everything lives in main() so bash parses the whole script before checkout
# can swap this file for another version mid-run.
main() {
  local ref="main" build=0 rollback=0 arg
  for arg in "$@"; do
    case "$arg" in
      --build) build=1 ;;
      --rollback) rollback=1 ;;
      *) ref="$arg" ;;
    esac
  done
  local repo_root compose_file env_file tag_file
  repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  compose_file="deploy/docker-compose.prod.yml"
  env_file="deploy/.env.prod"
  tag_file="deploy/.image-tag"
  local -a compose=(docker compose -f "$compose_file" --env-file "$env_file" --env-file "$tag_file")

  cd "$repo_root"

  if [ ! -f "$env_file" ]; then
    echo "Missing $env_file. Copy deploy/.env.prod.example and fill it in." >&2
    exit 1
  fi
  if [ "$(stat -c '%a' "$env_file")" != "600" ]; then
    echo "Warning: $env_file should be chmod 600." >&2
  fi

  # What runs now (empty on the first deploy that uses this file)
  local current="" previous=""
  if [ -f "$tag_file" ]; then
    current="$(sed -n 's/^IMAGE_TAG=//p' "$tag_file")"
    previous="$(sed -n 's/^PREV_IMAGE_TAG=//p' "$tag_file")"
  fi

  if [ "$rollback" -eq 1 ]; then
    if [ -z "$previous" ]; then
      echo "No previous images to roll back to ($tag_file has no PREV_IMAGE_TAG). Use deploy/deploy.sh <commit>." >&2
      exit 1
    fi
    echo "==> Rolling back from $current to $previous (no checkout, no build, no pull)"
    printf 'IMAGE_TAG=%s\nPREV_IMAGE_TAG=%s\n' "$previous" "$current" > "$tag_file"
    "${compose[@]}" up -d --no-build web api
    ref="rollback"
  else
    echo "==> Fetching $ref"
    git fetch --tags --prune origin
    if git show-ref --verify --quiet "refs/remotes/origin/$ref"; then
      git checkout "$ref"
      git pull --ff-only origin "$ref"
    else
      git checkout --detach "$ref"
    fi
    echo "==> At $(git rev-parse --short HEAD) ($(git describe --tags --always))"

    # The images of exactly this commit; the ones running now stay as the rollback
    local next
    next="$(git rev-parse HEAD)"
    [ "$next" = "$current" ] || previous="$current"
    printf 'IMAGE_TAG=%s\nPREV_IMAGE_TAG=%s\n' "$next" "$previous" > "$tag_file"
    if [ "$build" -eq 1 ]; then
      echo "==> Building on this server and starting (IMAGE_TAG $next)"
      "${compose[@]}" up -d --build
    else
      echo "==> Pulling the images of $next"
      if ! "${compose[@]}" pull web api; then
        echo "Could not pull the images of $next from ghcr.io. Either this server is not logged in to the registry" >&2
        echo "(docker login ghcr.io, docs/ops/server-disk.md), or there are no images for this commit (not a commit of" >&2
        echo "main, or the Images workflow has not finished). Build here instead: deploy/deploy.sh $ref --build" >&2
        printf 'IMAGE_TAG=%s\nPREV_IMAGE_TAG=%s\n' "$current" "$previous" > "$tag_file"
        exit 1
      fi
      echo "==> Starting"
      "${compose[@]}" up -d --no-build
    fi
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
      echo "Services did not become healthy in time. deploy/deploy.sh --rollback puts the previous images back." >&2
      "${compose[@]}" ps
      "${compose[@]}" logs --tail 40
      exit 1
    fi
    sleep 5
  done

  echo "==> Container status"
  "${compose[@]}" ps

  # Removed: build cache older than 3 days (from --build), our own images other than the running and the previous tag,
  # and dangling layers. Kept: the base images (node, golang, alpine, caddy) and every volume. Nothing here fails the deploy.
  local keep
  keep="$(sed -n 's/^\(PREV_\)\{0,1\}IMAGE_TAG=//p' "$tag_file" | grep . | paste -sd'|' -)"
  echo "==> Disk before cleanup"
  docker system df || true
  echo "==> Pruning build cache older than 3 days and our images other than ${keep//|/ and }"
  docker builder prune -f --filter until=72h || echo "Builder prune failed (deploy is fine)." >&2
  docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E '(^|/)nutrition-(web|api):' | grep -vE ":(${keep})\$" \
    | xargs -r docker image rm || echo "Removing old images failed (deploy is fine)." >&2
  docker image prune -f || echo "Dangling image prune failed (deploy is fine)." >&2
  echo "==> Disk after cleanup"
  docker system df || true

  # Last: the site, the API and a write round trip as a user. A failure exits non-zero and rolls nothing back.
  if ! deploy/smoke.sh; then
    echo "==> Deployed $ref ($(sed -n 's/^IMAGE_TAG=//p' "$tag_file")), but the SMOKE TEST FAILED (see above). deploy/deploy.sh --rollback goes back." >&2
    exit 1
  fi

  echo "==> Deployed $ref ($(sed -n 's/^IMAGE_TAG=//p' "$tag_file"))"
}

main "$@"
exit 0
