# Migrations 23/10: run sheet for Hao

Commands only: nobody has run them on staging or production. Staging (Supabase project `hitmicro-staging`) first, then production.

Rehearsed twice on 23/10 on a local Postgres 17 in Docker (every migration in order, then this sheet's blocks copied as written, only `DATABASE_URL` different). The second run covered the rollback below: down file first, a backup kept with owners and grants, the dependency check stopping on a trigger on `auth.users`, a role's grant surviving the restore and the fallback. Results in #88.

**Order: 000021 on staging and prod first (the current API ignores the new columns), then merge #88, then deploy. Never deploy main with #88 before 000021 is on that database.**

> This file is planned in two PRs. Job C of `prompts/day-api-1023.md` (branch `fix/documents-hardening`, 000017–000019 and the deploy) was not on `origin` when this was written, so this PR (`feat/profile-level`) creates the file with the 000021 part and the order. Whichever PR merges second keeps both parts.

## How migrations are applied in this repo

- There is **no migration tool and no version table** (no `schema_migrations`): the files in `migrations/` are plain SQL, applied by hand, one at a time, with `psql -v ON_ERROR_STOP=1` (`docs/deploy.md`, `docs/backend-sync-2026-10-22.md`). Do not use `make db-migrate`: it re-runs every file and ignores errors.
- So "is it applied?" is answered by looking for its objects (the checks below), and the record of what ran is the STATUS line you post in the night channel after each step.
- Everything runs in `postgres:17-alpine` (the database is 17; the VPS's own `pg_dump` is 16), with `DATABASE_URL` exported once and never typed on a command line.

The helper used below (paste it once per terminal; the URL stays inside the container's environment). It passes `-i` to Docker only when its input is piped or a file: with `-i` on a terminal, a `psql17` line swallowed every line pasted after it (rehearsal 23/10).

```bash
psql17() { local i=; [ -t 0 ] || i=-i; docker run --rm $i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"' psql17 "$@"; }
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
mkdir -p ~/migrations-1023 && for f in migrations/000021_profile_level.up.sql migrations/000021_profile_level.down.sql \
    docs/runbooks/sql/nutrition-dependents.sql docs/runbooks/sql/nutrition-grants.sql; do
  git show origin/feat/profile-level:$f > ~/migrations-1023/$(basename $f)   # origin/main once #88 is merged
done
M=~/migrations-1023 && ls -l $M
read -rs DATABASE_URL && export DATABASE_URL       # paste the hitmicro-staging session pooler URI, Enter
mkdir -p ~/backups
# 1. Backup: the whole nutrition schema WITH its owners and grants (custom format), and its grants beside it (as text and as SQL)
B=~/backups/staging-before-000021-$(date +%Y%m%d-%H%M)
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c 'pg_dump "$DATABASE_URL" --schema=nutrition -Fc' > $B.dump
psql17 -c '\dp nutrition.*' > $B.dp.txt && psql17 -c '\ddp' > $B.ddp.txt && psql17 -At < $M/nutrition-grants.sql > $B.grants.sql
ls -l $B.*                                                   # four files, the .dump not empty
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
mkdir -p ~/migrations-1023 && for f in migrations/000021_profile_level.up.sql migrations/000021_profile_level.down.sql \
    docs/runbooks/sql/nutrition-dependents.sql docs/runbooks/sql/nutrition-grants.sql; do
  git show origin/feat/profile-level:$f > ~/migrations-1023/$(basename $f)   # origin/main once #88 is merged
done
M=~/migrations-1023 && ls -l $M
psql17() { local i=; [ -t 0 ] || i=-i; docker run --rm $i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 "$@"' psql17 "$@"; }
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
# 1. Backup (as on staging: owners and grants kept, grants beside it)
B=~/backups/prod-before-000021-$(date +%Y%m%d-%H%M)
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c 'pg_dump "$DATABASE_URL" --schema=nutrition -Fc' > $B.dump
psql17 -c '\dp nutrition.*' > $B.dp.txt && psql17 -c '\ddp' > $B.ddp.txt && psql17 -At < $M/nutrition-grants.sql > $B.grants.sql
ls -l $B.*
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

Two ways back, in this order. The 000021 down file is the normal one: 000021 only adds two columns, so its down file only drops those two (and their checks); nothing else changes and nothing written since is lost. The backup restore is the last resort.

### 1. The 000021 down file (first)

The API that does not read the columns goes back **first**, or `GET /me` answers 500 once they are gone. On production, after the `ssh`, `cd`, `psql17` and `export DATABASE_URL` lines of the production section; on staging, from your Mac as in the staging section.

```bash
deploy/deploy.sh <the short sha noted before deploy.sh>       # production, on the VPS
psql17 -c "SELECT u.email, p.level, p.level_seen FROM nutrition.profiles p JOIN auth.users u ON u.id = p.user_id WHERE p.level > 0"   # note the Levels: they go with the columns
( echo 'BEGIN;'; cat ~/migrations-1023/000021_profile_level.down.sql; echo 'COMMIT;' ) | psql17 -q
psql17 -Atc "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'nutrition' AND table_name = 'profiles' AND column_name IN ('level', 'level_seen')"   # 0
```

The web then shows Level 0 again for everyone.

### 2. Restore the backup (last resort)

Only if the down file is not enough. Everything written after the backup is lost. Run it with the same admin user that took the backup (the same `DATABASE_URL`), so the dump's owners and grants can be set again.

```bash
# R1. Pick ONE backup: the newest of this environment, printed; type yes to go on
B=$(ls -t ~/backups/prod-before-000021-*.dump | head -1)     # staging: ~/backups/staging-before-000021-*.dump
B=${B%.dump}; ls -l $B.dump $B.dp.txt $B.ddp.txt $B.grants.sql
printf 'Restore from %s.dump ? Type yes: ' "$B"; read -r ok
```

Answer the question, then paste the rest (pasted together, `read` would take the next pasted line as the answer):

```bash
# R2. Nothing outside nutrition may depend on it (DROP SCHEMA nutrition CASCADE would drop or break it). Any line: STOP and tell Hao
deps=$(psql17 -At -F ' | ' < ~/migrations-1023/nutrition-dependents.sql) && checked=yes || checked=no
if [ "$checked" = yes ] && [ -z "$deps" ]; then echo "R2 ok: nothing outside nutrition depends on it"; else echo "STOP, tell Hao (check ran: $checked):"; echo "$deps"; fi
# R3. Restore only after yes and a clean R2: drop the schema and load the dump, owners and grants included, in ONE transaction
[ "$ok" = yes ] && [ "$checked" = yes ] && [ -z "$deps" ] && \
  ( echo 'BEGIN;'; echo 'DROP SCHEMA nutrition CASCADE;'; docker run --rm -i postgres:17-alpine pg_restore -f - < $B.dump; echo 'COMMIT;' ) | psql17 -q \
  || echo "R3 did not restore: not confirmed, R2 not clean, or an error (then ROLLBACK: nothing changed)"
# R4. Checks: the rows of the backup, and the grants as recorded (no diff lines = the same)
psql17 -Atc "SELECT count(*) FROM nutrition.profiles"
psql17 -At < ~/migrations-1023/nutrition-grants.sql | diff $B.grants.sql - && echo "grants as before the migration"
```

- R2 lists views, triggers (for example one on `auth.users` that calls a `nutrition` function), foreign keys and policies outside the schema that depend on it, and functions outside it whose body names it. The restore does not bring those back, so it stops there: Hao decides.
- If R3 is refused for an owner or a grant (`must be owner of …`, `permission denied …` on an `ALTER … OWNER` or `GRANT` line, possible on Supabase), the transaction rolls back and nothing changed. Then restore without owners and grants and put the recorded grants back in the same transaction, then R4 again:

  ```bash
  [ "$ok" = yes ] && [ "$checked" = yes ] && [ -z "$deps" ] && \
    ( echo 'BEGIN;'; echo 'DROP SCHEMA nutrition CASCADE;'; docker run --rm -i postgres:17-alpine pg_restore -f - --no-owner --no-acl < $B.dump; cat $B.grants.sql; echo 'COMMIT;' ) | psql17 -q
  ```

  `$B.dp.txt` and `$B.ddp.txt` are the same grants as `\dp` / `\ddp` printed them, to compare by eye.
- Loading a dump without the `DROP SCHEMA` stops at once with `ERROR: schema "nutrition" already exists`. The extensions (`pg_trgm`, `unaccent`, `pgcrypto`) are in `public` and are not touched.
