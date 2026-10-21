# Production deploy runbook (lehongkhanh.vn)

One Vietnix VPS (Ubuntu 24.04, 2 CPU, 4 GB), Docker, Caddy for HTTPS. Database and Auth are Supabase; there is no Postgres on the server.

| Piece | Where | Notes |
|---|---|---|
| `lehongkhanh.vn` | Caddy, then `web:3000` | Next.js (`next start`) |
| `www.lehongkhanh.vn` | Caddy | permanent redirect to the apex |
| `api.lehongkhanh.vn` | Caddy, then `api:8080` | Go API |
| Database, Auth | Supabase | `DATABASE_URL`, JWKS |

Files: `deploy/docker-compose.prod.yml`, `deploy/Caddyfile`, `deploy/.env.prod.example`, `deploy/setup-server.sh`, `deploy/deploy.sh`, `apps/web/Dockerfile`, `apps/api/Dockerfile`.

Only Caddy publishes ports (80, 443). `web` and `api` are reachable only on the compose network. Memory limits: web 1 GB, api 256 MB, caddy 128 MB.

## First-time setup, in order

### 1. DNS

At the registrar, point three A records at the VPS public IP:

| Name | Type | Value |
|---|---|---|
| `lehongkhanh.vn` | A | VPS IP |
| `www.lehongkhanh.vn` | A | VPS IP |
| `api.lehongkhanh.vn` | A | VPS IP |

Use a short TTL (300 s) until the first certificate is issued. Caddy cannot get certificates until these resolve to the server (`dig +short api.lehongkhanh.vn`).

### 2. Supabase (before the first deploy)

1. Apply only the migrations that are not yet in the database, one file at a time, stopping on the first error (from a machine with `psql`). Do not use `make db-migrate`: it re-runs every file and ignores failures.
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/000010_user_roles.up.sql
   ```
   Before each file, check in `psql` whether its objects already exist (for 000010: the `role` column on `nutrition.profiles` and the `nutrition.coach_applications` table); skip the file if they do. After it, `\d nutrition.profiles` shows `role text not null default 'user'`.
   `DATABASE_URL` must be the Supabase **Session pooler** (IPv4) URL, `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require`. The direct `db.<project-ref>.supabase.co` host is IPv6-only and does not work from the VPS.
2. Collect: project URL, anon key, JWT secret (Settings, API), the JWKS URL (`<project url>/auth/v1/.well-known/jwks.json`), and the database connection string.
3. Auth settings are in the section "Supabase Auth settings" below. Do them before testing sign-in.
4. hCaptcha: site key (public) and secret key.

### 3. Prepare the server (as root, once)

From your machine, copy the script and run it. The VPS must already accept your SSH key for root.

```bash
scp deploy/setup-server.sh root@<server-ip>:/root/
ssh root@<server-ip> 'bash /root/setup-server.sh'
```

The script is idempotent. It creates the `deploy` user (sudo, key-only), copies the root `authorized_keys`, disables root and password SSH login, enables ufw (22, 80, 443), fail2ban and unattended-upgrades, adds 2 GB swap, installs Docker Engine and the compose plugin from Docker's official apt repository, and adds `deploy` to the `docker` group. It prints what it did and never prints keys.

Before you close the root session, open a second terminal and check:

```bash
ssh deploy@<server-ip>
docker run --rm hello-world
```

### 4. Get the code onto the server (as `deploy`)

The repository is private, so use a read-only deploy key:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N '' -C 'vps-deploy'
cat ~/.ssh/github_deploy.pub     # add this as a read-only Deploy key on the GitHub repository
printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
chmod 600 ~/.ssh/config
git clone git@github.com:DongDuong2001/nutrition-fortifykitchen.git ~/nutrition
cd ~/nutrition
```

### 5. Create the environment file

```bash
cp deploy/.env.prod.example deploy/.env.prod
chmod 600 deploy/.env.prod
nano deploy/.env.prod
```

| Variable | Used by | Value |
|---|---|---|
| `NEXT_PUBLIC_API_MODE` | web (build) | `live` |
| `NEXT_PUBLIC_API_URL` | web (build) | `https://api.lehongkhanh.vn/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | web (build) | `https://lehongkhanh.vn` (sitemap, metadata, auth callback) |
| `NEXT_PUBLIC_SUPABASE_URL` | web (build) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web (build) | Supabase anon key |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | web (build) | hCaptcha site key |
| `PORT` | api | `8080` |
| `ENVIRONMENT` | api | `production` (the API refuses weak `DATABASE_URL` values in this mode) |
| `DATABASE_URL` | api | Supabase **Session pooler** (IPv4) URL, `sslmode=require` (not the direct `db.*` host) |
| `SUPABASE_URL` | api | Supabase project URL |
| `SUPABASE_JWKS_URL` | api | `<project url>/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_SECRET` | api | Supabase JWT secret |
| `CORS_ALLOWED_ORIGINS` | api | `https://lehongkhanh.vn,https://www.lehongkhanh.vn` |
| `HCAPTCHA_SECRET_KEY` | api | hCaptcha secret key |
| `SESSION_REVOCATION_ENABLED` | api | `false` (default; turn on only after hitmicro-staging shows real sessions are found and valid logins get 200) |

`NEXT_PUBLIC_*` values are baked into the web bundle (and the CSP `connect-src`) when the image is built. Changing one needs a rebuild: run `deploy/deploy.sh` again.

### 6. Make an initial admin and coach (optional, once)

Roles come from `nutrition.profiles.role` only (the JWT `app_metadata.role` is ignored). After the first admin has signed in once, in the Supabase SQL editor:

```sql
UPDATE nutrition.profiles SET role = 'admin' WHERE user_id = '<auth user id>';
```

### 7. First deploy (as `deploy`, in the repo)

```bash
deploy/deploy.sh
```

It fetches, checks out `main`, fast-forwards, builds, starts, waits up to 3 minutes for every container to be healthy, prints status and prunes old images. The first build takes several minutes on 2 CPUs (swap is there for `next build`). Caddy requests the certificates on first start.

## Check after deploy

- [ ] `https://lehongkhanh.vn` loads (valid certificate, no warning).
- [ ] `https://www.lehongkhanh.vn` redirects to `https://lehongkhanh.vn`.
- [ ] `https://api.lehongkhanh.vn/healthz` returns 200.
- [ ] `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod ps` shows web, api and caddy as `healthy`.
- [ ] Sign-in works (email and Google), the callback lands on `https://lehongkhanh.vn`, a diary entry saves and reloads.
- [ ] Browser console on `/`, `/signin` and a diary page: no Content-Security-Policy errors, no CORS errors, hCaptcha renders.
- [ ] An admin can open `/admin/review`; a normal user gets 403 from `/api/v1/admin/*`.
- [ ] `curl -sI https://lehongkhanh.vn | grep -i -E 'strict-transport|content-security'` shows the headers once each (the app sets them, Caddy does not repeat them).

## Testing by IP before the domain is live

While DNS is not live, `deploy/Caddyfile` also serves a temporary plain-HTTP site on the server IP and on `:80`: `/healthz` and `/api/*` go to the API, everything else to the web app.

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://<server-ip>/       # 200
curl -s http://<server-ip>/healthz                                   # API and database reachable
curl -sI http://<server-ip>/ | grep -i content-security-policy       # present
```

Sign-in cannot be tested this way: the web bundle calls `https://api.lehongkhanh.vn` and the Supabase redirect URLs are for the domain. The three domain sites in the Caddyfile get certificates by themselves once DNS resolves to the server. Remove the IP site afterwards (see the comment in the Caddyfile) and redeploy.

## Check after the domain goes live

- [ ] `dig +short lehongkhanh.vn www.lehongkhanh.vn api.lehongkhanh.vn` returns the server IP for all three.
- [ ] `curl -sI https://lehongkhanh.vn` returns 200 with a valid certificate; `dc logs caddy` shows the certificates obtained.
- [ ] `curl -sI https://www.lehongkhanh.vn` returns a 301 to `https://lehongkhanh.vn/`.
- [ ] `curl -s https://api.lehongkhanh.vn/healthz` returns 200.
- [ ] `http://lehongkhanh.vn` redirects to HTTPS.
- [ ] Sign-in works end to end (email and Google), the callback lands on `https://lehongkhanh.vn`.
- [ ] Browser console on `/`, `/signin` and a diary page: no Content-Security-Policy errors, no CORS errors.
- [ ] Supabase Auth Site URL and redirect URLs are set (section below).

## Supabase Auth settings

Dashboard, Authentication, URL Configuration:

| Setting | Value |
|---|---|
| Site URL | `https://lehongkhanh.vn` |
| Redirect URLs | `https://lehongkhanh.vn/**` |
| | `https://www.lehongkhanh.vn/**` |

Remove localhost entries from production redirect URLs if the project is production-only. If Google sign-in is on, add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI in the Google console, and the production domain as an authorized origin.

## Routine operations

All commands from `~/nutrition` as `deploy`.

```bash
alias dc='docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod'
dc ps                    # status
dc logs -f --tail 100 api
dc restart api
```

Update: `deploy/deploy.sh` (latest `main`). Merge to `main` first; the script never deploys an unmerged branch unless you pass a ref.

## Rollback

Tag releases you ship (`git tag v1.0.0 && git push --tags` from your machine). To roll back:

```bash
cd ~/nutrition
deploy/deploy.sh <previous-tag>      # e.g. deploy/deploy.sh v1.0.0
```

This checks out the tag (detached) and rebuilds from it. Equivalent to `git checkout <previous tag>` followed by the same build and health wait; passing the tag to the script keeps the script from switching back to `main`. To go forward again, run `deploy/deploy.sh` with no argument.

Database migrations are not rolled back by this. If a release included a migration, restore through `docs/09-disaster-recovery.md` or apply the matching `*.down.sql` by hand before rolling back the code.

## Troubleshooting

| Symptom | Check |
|---|---|
| Caddy has no certificate | DNS for all three names resolves to the VPS; ports 80 and 443 open (`sudo ufw status`); `dc logs caddy` |
| api exits at start | `dc logs api`; `ENVIRONMENT=production` rejects `sslmode=disable` and default credentials; JWT secret or JWKS URL missing |
| Web build killed | Out of memory: `free -h` (swap should show 2 GB); retry `deploy/deploy.sh`; stop other builds |
| Sign-in loops or fails | Supabase Site URL and redirect URLs; `NEXT_PUBLIC_SITE_URL`; `CORS_ALLOWED_ORIGINS` |
| Console CSP error on API calls | `NEXT_PUBLIC_API_URL` was empty or wrong at build time; fix `.env.prod` and redeploy |
| Admin or coach pages return 403 | `nutrition.profiles.role` for that user (see step 6) |

## Security notes

- `deploy/.env.prod` stays on the server, `chmod 600`, never committed (it is git-ignored).
- Docker published ports bypass ufw; that is why only Caddy publishes ports. Do not add `ports:` to `web` or `api`.
- Root SSH login and password login are disabled by `setup-server.sh`. Keep a second session open when changing SSH settings.
