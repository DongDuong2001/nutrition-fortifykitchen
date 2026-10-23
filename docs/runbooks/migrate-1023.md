# Migrations 23/10: run sheet for Hao

Commands only: nobody has run them on staging or production. Staging (Supabase project `hitmicro-staging`) first, then production.

Rehearsed 23/10 on a local Postgres 17 in Docker (every migration in order, then this sheet's staging block, the set/read-back SQL, the rollback and the restore, copied as written with only `DATABASE_URL` different): all ran; the restore line was the one fix. Results in #88.

**Order: 000021 on staging and prod first (the current API ignores the new columns), then merge #88, then deploy. Never deploy main with #88 before 000021 is on that database.**

> This file is planned in two PRs. Job C of `prompts/day-api-1023.md` (branch `fix/documents-hardening`, 000017–000019 and the deploy) was not on `origin` when this was written, so this PR (`feat/profile-level`) creates the file with the 000021 part and the order. Whichever PR merges second keeps both parts.

## How migrations are applied in this repo

- There is **no migration tool and no version table** (no `schema_migrations`): the files in `migrations/` are plain SQL, applied by hand, one at a time, with `psql -v ON_ERROR_STOP=1` (`docs/deploy.md`, `docs/backend-sync-2026-10-22.md`). Do not use `make db-migrate`: it re-runs every file and ignores errors.
- So "is it applied?" is answered by looking for its objects (the checks below), and the record of what ran is the STATUS line you post in the night channel after each step.
- Everything runs in `postgres:17-alpine` (the database is 17; the VPS's own `pg_dump` is 16), with `DATABASE_URL` exported once and never typed on a command line.

The helper used below (paste it once per terminal; the URL stays inside the container's environment):

```bash
psql17() { docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"' psql17 "$@"; }
```

## Order

| # | File | Touches | Applied when this shows it |
|---|---|---|---|
| 000017 | `000017_documents` | `nutrition.documents`, `nutrition.document_access_codes` | `\dt nutrition.document*` lists both |
| 000018 | `000018_training_minutes` | the two training-minutes checks | `\d nutrition.profiles` shows `profiles_training_minutes_default_check` with `% 30` |
| 000019 | `000019_document_code_scope` (Job A, once merged) | `document_access_codes.document_name` | `\d nutrition.document_access_codes` shows `document_name` |
| 000020 | only if the custom-food job adds one | | |
| **000021** | **`000021_profile_level` (this PR)** | `nutrition.profiles.level`, `level_seen` | `\d nutrition.profiles` shows `level` and `level_seen` |

Run them in number order. 000021 touches only two new columns of `nutrition.profiles`, so it does not depend on 000017–000020; the numbers 000019 and 000020 were left free for the other jobs of 23/10.

**Migration before the API.** The API of this PR reads `level` and `level_seen` in `GET /me`: deployed before 000021, it answers 500 for every signed-in user. The API running now never reads the new columns, so 000021 goes on first while #88 is still open; the files come from the PR branch (`git show`, nothing checked out). The web is safe either way (it reads the fields when they are there).

## 000021 on staging (`hitmicro-staging`, from your Mac with Docker)

```bash
cd ~/Documents/HITMicro/nutrition-fortifykitchen && git fetch origin
mkdir -p ~/migrations-1023 && for f in up down; do
  git show origin/feat/profile-level:migrations/000021_profile_level.$f.sql > ~/migrations-1023/000021_profile_level.$f.sql   # origin/main once #88 is merged
done
M=~/migrations-1023 && ls -l $M
read -rs DATABASE_URL && export DATABASE_URL       # paste the hitmicro-staging session pooler URI, Enter
mkdir -p ~/backups
# 1. Backup: the whole nutrition schema
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --schema=nutrition --no-owner --no-acl' | gzip -9 > ~/backups/staging-before-000021-$(date +%Y%m%d-%H%M).sql.gz
ls -lh ~/backups | tail -1                                   # not empty
# 2. Already there? (0 = not applied yet; 2 = applied, stop here)
psql17 -Atc "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'nutrition' AND table_name = 'profiles' AND column_name IN ('level', 'level_seen')"
# 3. Dry run, rolled back: must end without ERROR
( echo 'BEGIN;'; cat $M/000021_profile_level.up.sql; echo 'ROLLBACK;' ) | psql17 -q
# 4. For real
( echo 'BEGIN;'; cat $M/000021_profile_level.up.sql; echo 'COMMIT;' ) | psql17 -q
# 5. Checks
psql17 -c '\d nutrition.profiles'
psql17 -c "SELECT level, level_seen, count(*) FROM nutrition.profiles GROUP BY 1, 2"
unset DATABASE_URL
```

Step 5: `\d` lists `level | smallint | not null | 0` and `level_seen | smallint | not null | 0`, and under "Check constraints" `profiles_level_check CHECK (level >= 0 AND level <= 5)` and `profiles_level_seen_check CHECK (level_seen >= 0 AND level_seen <= 5)`. The count is one row, `0 | 0 | <every profile>`. The live app keeps working as before (the running API does not read the columns).

(Both `ADD COLUMN ... DEFAULT 0` are quick on Postgres 11+: the default is stored once, no table rewrite. Up and down are idempotent: run twice, they skip what is there.)

## 000021 on production (the VPS)

Only after staging is checked.

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin
mkdir -p ~/migrations-1023 && for f in up down; do
  git show origin/feat/profile-level:migrations/000021_profile_level.$f.sql > ~/migrations-1023/000021_profile_level.$f.sql   # origin/main once #88 is merged
done
M=~/migrations-1023 && ls -l $M
psql17() { docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"' psql17 "$@"; }
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
# 1. Backup
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --schema=nutrition --no-owner --no-acl' | gzip -9 > ~/backups/prod-before-000021-$(date +%Y%m%d-%H%M).sql.gz
ls -lh ~/backups | tail -1
# 2. Already there?
psql17 -Atc "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'nutrition' AND table_name = 'profiles' AND column_name IN ('level', 'level_seen')"
# 3. Dry run (ROLLBACK), read the output
( echo 'BEGIN;'; cat $M/000021_profile_level.up.sql; echo 'ROLLBACK;' ) | psql17 -q
# 4. For real (COMMIT)
( echo 'BEGIN;'; cat $M/000021_profile_level.up.sql; echo 'COMMIT;' ) | psql17 -q
# 5. Same checks as staging step 5
psql17 -c '\d nutrition.profiles'
unset DATABASE_URL
```

## Then merge #88 and deploy

Only when step 5 passed on **both** databases. Merge #88, then on the VPS:

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git rev-parse --short HEAD                                   # note it: the API to go back to (rollback below)
deploy/deploy.sh                                             # latest main, with #88
```

After the deploy: `curl -s https://api.lehongkhanh.vn/healthz`, sign in on the live app, Hôm nay loads (a 500 on `/me` means this database has no 000021), `GET /api/v1/me` has `"level":0,"levelSeen":0` for a user nobody has set, a profile save from Hồ sơ still saves.

## Setting one user's Level by email (until the coach screens exist)

`nutrition.profiles.user_id` is `auth.users.id` (migration 000002: `user_id UUID PRIMARY KEY REFERENCES auth.users(id)`), and the email lives in `auth.users.email`. The user must have finished setup (a profile row); otherwise the UPDATE says `UPDATE 0` and nothing changes. On production, run it on the VPS after the `ssh`, `cd`, `psql17` and `export DATABASE_URL` lines above (it works as soon as 000021 is on the database, before #88 is deployed); on staging, from your Mac after `read -rs DATABASE_URL && export DATABASE_URL`.

```bash
# Set: change the email and the Level (0–5). level_seen comes down with a lower Level, so a later raise celebrates again.
psql17 -v email='someone@example.com' -v lvl=3 <<'SQL'
BEGIN;
UPDATE nutrition.profiles AS p
   SET level = :lvl,
       level_seen = LEAST(p.level_seen, :lvl)
  FROM auth.users AS u
 WHERE u.id = p.user_id
   AND lower(u.email) = lower(:'email')
RETURNING u.email, p.level, p.level_seen, p.updated_at;
COMMIT;
SQL

# Read it back
psql17 -v email='someone@example.com' <<'SQL'
SELECT u.email, p.level, p.level_seen, p.updated_at
  FROM nutrition.profiles AS p
  JOIN auth.users AS u ON u.id = p.user_id
 WHERE lower(u.email) = lower(:'email');
SQL
```

The UPDATE must print one row with the new `level`; `UPDATE 0` means no profile for that email (wrong address, or setup not finished): nothing was changed. A Level above 5 stops with `violates check constraint "profiles_level_check"`. `updated_at` moves on its own (trigger `trg_profiles_touch_updated_at`), so the user's devices take the new Level on their next profile read. The API never lets the user change `level`; their own save only moves `level_seen` (stored at most as `level`) when the celebration closes.

## Rollback

Down migration first only after the API that does not read the columns is back, or `GET /me` answers 500:

```bash
deploy/deploy.sh <the short sha noted before deploy.sh>       # production, on the VPS
( echo 'BEGIN;'; cat ~/migrations-1023/000021_profile_level.down.sql; echo 'COMMIT;' ) | psql17 -q
psql17 -Atc "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'nutrition' AND table_name = 'profiles' AND column_name IN ('level', 'level_seen')"   # 0
```

- `000021` down drops the two checks and the two columns: every Level set by SQL is lost, and the web shows Level 0 again. Note the Levels first if they matter: `psql17 -c "SELECT u.email, p.level, p.level_seen FROM nutrition.profiles p JOIN auth.users u ON u.id = p.user_id WHERE p.level > 0"`.
- Restoring the backup instead, only if the down migration is not enough. The dump recreates the `nutrition` schema, so it is loaded into an emptied one: dropping the schema and loading the dump run in **one transaction**, so an error leaves the database as it was. Everything written after the backup is lost. (The extensions are in `public` and stay. The dump has no grants (`--no-acl`); the API connects as the owner, so it does not need them.)

  ```bash
  ( echo 'BEGIN;'; echo 'DROP SCHEMA nutrition CASCADE;'; gunzip -c ~/backups/prod-before-000021-*.sql.gz; echo 'COMMIT;' ) | psql17 -q
  # staging: ~/backups/staging-before-000021-*.sql.gz instead
  psql17 -Atc "SELECT count(*) FROM nutrition.profiles"     # the count from before the migration
  ```

  Loading the dump without the `DROP SCHEMA` stops at once with `ERROR: schema "nutrition" already exists` (checked in the 23/10 rehearsal).
