# Server disk and memory (VPS 14.225.210.185)

Dong reported the VPS at about 7 GB of 10 (20/10). This page says what fills it, what perf/server-image changes, and
what Hao runs by hand once.

## What fills the disk
- **The web image was about 1.2 GB.** Its runner copied the whole build tree: `node_modules` (670 MB, both
  `@next/swc` builds, vitest, typescript) and `.next` with the webpack cache (330–370 MB). It is now the standalone
  server: `server.js`, the traced `node_modules` (no sharp), `.next/static` and `public`. That is about 50 MB on top of
  the node:22-alpine base (about 175 MB).
- **BuildKit cache.** `deploy.sh` builds on the VPS (`up -d --build`), about 1.5 GB of cache per deploy, and only ran
  `docker image prune -f`, which never touches the build cache. After every healthy deploy it now removes build cache
  older than 3 days, our own images other than `:prod` (running) and `:prev` (the rollback), and dangling layers, and
  prints `docker system df` before and after. The base images (node, golang, alpine, caddy) stay, so a build does not
  download them again.
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

## Rolling back
- **Instantly, to the deploy before:** `deploy.sh` tags the images that were running as `nutrition-web:prev` and
  `nutrition-api:prev` before it builds. To put them back without building:
  ```bash
  ssh deploy@14.225.210.185 'cd /var/www/nutrition-meals && docker tag nutrition-web:prev nutrition-web:prod && docker tag nutrition-api:prev nutrition-api:prod && docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --no-build web api'
  ```
  The checkout still holds the newer commit, so the next `deploy/deploy.sh <ref>` decides what runs after that.
- **To any older version:** `deploy/deploy.sh <tag or commit>`, as before. It checks out that ref and builds it.
- **This change:** deploy the commit before it. The old Dockerfile runs `next start` again, and the compose file
  goes back to `json-file` logs and a 768 MB heap. Nothing on the server has to change. Pruned images are rebuilt
  from source by the deploy, so pruning never blocks a rollback.
