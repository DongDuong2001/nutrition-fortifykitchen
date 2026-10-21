# Server disk and memory (VPS 14.225.210.185)

Dong reported the VPS at about 7 GB of 10 (20/10). This page says what fills it, what perf/server-image changes, and
what Hao runs by hand once.

## What fills the disk
- **The web image was about 1.2 GB.** Its runner copied the whole build tree: `node_modules` (670 MB, both
  `@next/swc` builds, vitest, typescript) and `.next` with the webpack cache (330–370 MB). It is now the standalone
  server: `server.js`, the traced `node_modules` (no sharp), `.next/static` and `public`. That is about 50 MB on top of
  the node:22-alpine base (about 175 MB).
- **BuildKit cache.** `deploy.sh` built on the VPS (`up -d --build`), about 1.5 GB of cache per deploy, and only ran
  `docker image prune -f`, which never touches the build cache. Now it pulls the images built on GitHub (below), so
  there is no build cache unless `--build` is used. After every healthy deploy it removes build cache older than
  3 days, our own images other than the running and the previous commit (`IMAGE_TAG`, `PREV_IMAGE_TAG` in
  `deploy/.image-tag`), and dangling layers, and prints `docker system df` before and after. The base images (node,
  golang, alpine, caddy) stay.
- **Logs.** The containers used the `json-file` driver (plain text). They now use `local` (compressed, 10 MB × 3 per
  container).
- **The API image** is already multi-stage, alpine with a static Go binary: about 50 MB. Not changed.

## daemon.json (Hao, once, by hand)
The cache limit and the default log driver for anything not started by our compose file. On the VPS, as root:

```json
{
  "builder": { "gc": { "enabled": true, "defaultKeepStorage": "2GB" } },
  "log-driver": "local",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
```

Put it in `/etc/docker/daemon.json` (merge with what is there), then `sudo systemctl restart docker`. The restart
stops the containers for a few seconds; `restart: unless-stopped` brings them back. A changed log driver applies to
containers created after the restart: the next `deploy/deploy.sh` recreates them.

## One-time cleanup (Hao)
Read first, then clean. Each command is one line run from your machine (one-shot `ssh`).

1. What is there (read only):
   ```bash
   ssh deploy@14.225.210.185 'cd /var/www/nutrition-meals && df -h && free -h && docker system df && docker system df -v | head -40'
   ```
2. Build cache and unused images (the running containers and their images stay; no volume is touched):
   ```bash
   ssh deploy@14.225.210.185 'cd /var/www/nutrition-meals && docker builder prune -af && docker image prune -af && docker system df'
   ```
   Never `docker system prune --volumes` or `docker volume prune`: `caddy_data` holds the HTTPS certificates.
3. Old logs of containers created before the switch to `local` go when the next deploy recreates the containers.
   Check with:
   ```bash
   ssh -t deploy@14.225.210.185 'sudo du -sh /var/lib/docker/containers'
   ```

## Images from GitHub (ci/ghcr-images)
`.github/workflows/images.yml` builds the web and API images on every push to main and pushes them to
`ghcr.io/dongduong2001/nutrition-web` and `nutrition-api`, tagged with the commit sha (and `main` on main), and keeps
the last 20 of each. It stops first when one of the six variables below is empty or the API mode is not `live`, so it
never builds the mock app for production. `deploy/deploy.sh`
pulls the images of the commit it checks out and starts them (`up -d --no-build`). The VPS no longer builds, so there
is no build peak and no build cache on its disk. `deploy/deploy.sh <ref> --build` still builds on the server, for a
ref that has no images.

Once, before the first deploy that pulls:
1. **Actions variables** (GitHub → the repo → Settings → Secrets and variables → Actions → Variables), the same
   values as `deploy/.env.prod`: `NEXT_PUBLIC_API_MODE`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`. All are public (the
   browser gets them); no secret goes into an image. The API reads its secrets from `deploy/.env.prod` at run time,
   as before.
2. **Package visibility:** the first run creates both packages under Dong's account, private. Keep them private and
   log the VPS in (step 3), or make them public in the package settings and skip step 3.
3. **Registry login on the VPS** with a classic personal access token that has only `read:packages` (it is typed on
   the server, never stored in the repo):
   ```bash
   ssh -t deploy@14.225.210.185 'docker login ghcr.io -u <github user>'
   ```
4. Run the Images workflow once by hand on main (Actions → Images → Run workflow), or push to main, then deploy:
   ```bash
   ssh deploy@14.225.210.185 'cd /var/www/nutrition-meals && deploy/deploy.sh'
   ```
   A manual compose command must read the tag file too, or compose refuses to start (so it never switches version):
   `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod --env-file deploy/.image-tag …`.

## Rolling back
- **Instantly, to the deploy before:** `deploy/.image-tag` keeps the commit that runs (`IMAGE_TAG`) and the one before
  (`PREV_IMAGE_TAG`), and the cleanup keeps both images. To put the previous images back (no checkout, no build, no
  pull):
  ```bash
  ssh deploy@14.225.210.185 'cd /var/www/nutrition-meals && deploy/deploy.sh --rollback'
  ```
  The checkout still holds the newer commit, so the next `deploy/deploy.sh <ref>` decides what runs after that.
- **To any commit of main:** `deploy/deploy.sh <commit>`. It checks out that commit and pulls its images: nothing is
  rebuilt, so it takes about as long as the pull. The Images workflow keeps the last 20 of each. A ref with no images
  (a tag or branch off main, or a commit older than this workflow): `deploy/deploy.sh <ref> --build`.
- **This change:** deploy the commit before it with `--build`. The old Dockerfile runs `next start` again, and the
  compose file goes back to `json-file` logs and a 768 MB heap. Nothing on the server has to change. A pruned image
  is pulled again or rebuilt from source, so pruning never blocks a rollback.
