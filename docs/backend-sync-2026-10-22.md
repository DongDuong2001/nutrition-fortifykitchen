# Backend sync for the V3 release (22/10/2026): target settings and Ngày ăn mẫu

For Dong. Done on Hao's side with Dong's OK. Two V3 features kept their data on the device only, because the API had nowhere to store it: the macro split and custom targets (Mục tiêu) and Ngày ăn mẫu. This adds the storage and the endpoints (PR A), then switches the web to them (PR B, stacked on A). The CI maintenance is PR C. Nothing is merged and no database was touched: Hao runs the steps below.

## What changed (PR A: migrations + API)

### Migration 000015: `nutrition.profiles` target settings

All five columns are nullable. NULL means not set, and the app then uses the coach formula.

| Column | Type | Check (in the database and in the API) | JSON (GET /me, PUT /me/profile) |
|---|---|---|---|
| `macro_mode` | text | `default`, `ratios`, `fixed`, `keto` | `macroMode` |
| `macro_ratios` | jsonb | `{"proteinPct","carbsPct","fatPct"}`, each 0–100, sum 100 ± 1 | `macroRatios` |
| `macro_fixed` | jsonb | `{"proteinGrams","carbsGrams","fatGrams"}`, each 0–1000 | `macroFixed` |
| `custom_energy_kcal` | integer | 800–8000 | `customEnergyKcal` |
| `custom_targets` | jsonb | an object (DB). The API also checks the keys (the 21 DRI ids, no sodium) and the values (0–100000) | `customTargets` |

`updated_at` already existed (000002, NOT NULL DEFAULT now()). The new trigger `trg_profiles_touch_updated_at` (function `nutrition.touch_updated_at()`) sets it on **every** update, whoever writes the row: the API, a weigh-in, or an admin role change. `GET /me` returns it as `updated_at` (as before) and again as `updatedAt`. The web compares that with the device's last change.

API rules for `PUT /me/profile`:

- A key left out keeps the stored value, and JSON `null` clears it. The other fields (`sex`, `goal`…) behave as before.
- An invalid value is **400** `VALIDATION_FAILED`, with `error.fields` naming each bad field, for example `{"macroRatios": "macroRatios must add up to 100 (±1), got 105"}`. Nothing is written.
- `customTargets: {}` is stored as NULL, so "nothing set" has one form.
- **Stored only.** The API's own targets (day summary, trends, `target_days`) still use the coach formula and do not read these settings. Wiring them in is step 4 of `docs/pr/cc-73b-custom-targets.md`, still open for you.

### Migration 000016: `nutrition.day_templates`

```
id uuid PK (made by the client) · user_id uuid → auth.users ON DELETE CASCADE · name text (1–60) · tag text (tap|nghi|khac)
meals jsonb (array, 1–5) · created_at · updated_at (same trigger) · deleted_at (soft delete)
index (user_id, created_at DESC) WHERE deleted_at IS NULL · RLS on, own rows only (like 000005)
```

The index leads with `user_id` as asked, and adds `created_at DESC` so the list query is served by it in order.

| Endpoint | What it does |
|---|---|
| `GET /api/v1/day-templates` | `{"items": [...]}`, the user's live templates, newest first (`created_at DESC`) |
| `PUT /api/v1/day-templates/{id}` | Create or replace: body `{name, tag, meals, createdAt?}`, answers the stored template. The same body again gives the same result. **409 `ID_CONFLICT`**: the id is another user's template (live or deleted). **409 `CONFLICT`**: already 50 live templates. **400**: a bad id or field (`error.fields`). |
| `DELETE /api/v1/day-templates/{id}` | Soft delete (`deleted_at = now()`). Always 200, also when sent again or for an id that is not the user's (nothing is told about other users' ids). |

Decisions you may want to look at:

- **A replace keeps the first `created_at`**, so a template does not jump to the top when it is edited. `createdAt` in the body is only used on the first save (a template made on the device before it could be uploaded keeps its own date). If it is ahead of the server clock, the server time is used.
- **A PUT of a deleted template (same user) brings it back.** That is "create or replace" with a client-made id. The web never reuses an id after a delete, and its outbox replaces a waiting PUT by the DELETE for the same id.
- **Limit of 50:** checked in the API inside one transaction, holding a per-user advisory lock, so two saves at once cannot both pass it.
- `meals[].items[].foodId` is **not** a foreign key to `nutrition.foods`. A template may hold a recipe that exists only on the device, and copying it back already skips a food the catalogue no longer has. Each id must be non-empty and at most 128 characters.
- Limits that are not in the brief and protect the table: at most one meal per slot, `servingLabel` ≤ 80 characters, PUT body ≤ 64 KB.

Code: `apps/api/internal/profile/settings.go` (parsing and checks), `apps/api/internal/daytemplates/` (handler → service → repository, like the other modules), routes in `cmd/server/main.go`, `openapi.yaml` (schemas `MacroRatios`, `MacroFixed`, `CustomTargets`, `DayTemplate*`, paths `/day-templates`).

Tests:

- Unit: `internal/profile/settings_test.go` (each field: left out, null, valid, every edge, invalid with its field) and `internal/daytemplates/service_test.go` (validation and the handler's status codes).
- Integration on Postgres 17 (`make test-integration`, `cmd/server/integration_sync_test.go`):
  - Profile: set → get → a save without the fields → weigh-in (`updatedAt` moves) → invalid (400, nothing changed) → partial clear → clear all.
  - Templates: create, order, replay, replace, the other user (no rows, 409, a DELETE changes nothing), soft delete twice, revive, account delete cascade, and the limit of 50.

## Order of the rollout

1. **Migrations first**, on staging (`hitmicro-staging`), then on production. The new API reads the new columns, so an API deployed before 000015 answers 500 on `GET /me`.
2. Then the API (merge PR A, `deploy/deploy.sh`).
3. Then the web (PR B). The web keeps working against the old API (it reads the fields when they are there), but it only syncs once the API has them.

Old clients are safe with the new API: a PUT without the new fields leaves them unchanged.

## Steps for Hao: staging

Run them from a machine with Docker, with the staging connection string from the Supabase project `hitmicro-staging` (Settings → Database → Connection string, URI, session pooler). It is exported once, so it is never typed on a command line:

```bash
cd ~/Documents/HITMicro/nutrition-fk-backend-sync        # the PR A branch, or main after the merge
read -rs DATABASE_URL && export DATABASE_URL              # paste the staging URI, Enter
mkdir -p ~/backups
# 1. Backup: the whole nutrition schema
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --schema=nutrition --no-owner --no-acl' | gzip -9 > ~/backups/staging-before-000015-$(date +%Y%m%d-%H%M).sql.gz
ls -lh ~/backups | tail -1                                 # not empty
# 2. Dry run: both migrations inside a transaction that is rolled back
( echo 'BEGIN;'; cat migrations/000015_profiles_target_settings.up.sql migrations/000016_day_templates.up.sql; echo 'ROLLBACK;' ) |
  docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q'
# 3. For real (one transaction: all or nothing)
( echo 'BEGIN;'; cat migrations/000015_profiles_target_settings.up.sql migrations/000016_day_templates.up.sql; echo 'COMMIT;' ) |
  docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q'
# 4. Check
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -c "
  SELECT column_name, data_type FROM information_schema.columns
   WHERE table_schema = '\''nutrition'\'' AND table_name = '\''profiles'\''
     AND column_name IN ('\''macro_mode'\'','\''macro_ratios'\'','\''macro_fixed'\'','\''custom_energy_kcal'\'','\''custom_targets'\'','\''updated_at'\'') ORDER BY 1;
  SELECT tgname FROM pg_trigger WHERE tgname LIKE '\''trg_%_touch_updated_at'\'' ORDER BY 1;
  SELECT count(*) AS day_templates FROM nutrition.day_templates;"'
unset DATABASE_URL
```

Step 2 must end without `ERROR`; a few `NOTICE ... skipping` lines are expected. Step 4 must list 6 columns, the 2 triggers `trg_day_templates_touch_updated_at` and `trg_profiles_touch_updated_at`, and `day_templates = 0`. Then point a staging API at it and run the checks in "After the deploy" below.

## Steps for Hao: production

Only after staging is checked. The VPS has no Go and its `pg_dump` is 16 (the database is 17), so everything runs in `postgres:17-alpine` containers, with `DATABASE_URL` from `deploy/.env.prod`, as in `docs/data/new-foods-2026-10-21-import.md`.

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin && git checkout main && git pull --ff-only        # PR A merged: main has migrations/000015 and 000016
ls migrations/000015_profiles_target_settings.up.sql migrations/000016_day_templates.up.sql
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
# 1. Backup
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --schema=nutrition --no-owner --no-acl' | gzip -9 > ~/backups/prod-before-000015-$(date +%Y%m%d-%H%M).sql.gz
ls -lh ~/backups | tail -1
# 2. Dry run (ROLLBACK), read the output
( echo 'BEGIN;'; cat migrations/000015_profiles_target_settings.up.sql migrations/000016_day_templates.up.sql; echo 'ROLLBACK;' ) |
  docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q'
# 3. For real (COMMIT)
( echo 'BEGIN;'; cat migrations/000015_profiles_target_settings.up.sql migrations/000016_day_templates.up.sql; echo 'COMMIT;' ) |
  docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q'
# 4. Same check as staging step 4
# 5. Deploy the API (and the web, once PR B is merged)
deploy/deploy.sh
unset DATABASE_URL
```

`ALTER TABLE ... ADD COLUMN` without a default and `CREATE TABLE` are quick: they lock `profiles` for a moment and rewrite nothing.

## After the deploy (staging, then production)

With a signed-in account (the web's Mục tiêu đa lượng, or `curl` with a bearer token):

- `GET /api/v1/me` has `macroMode`, `macroRatios`, `macroFixed`, `customEnergyKcal`, `customTargets` (null for everyone at first) and `updatedAt`.
- Save a split on one device, then open the app on another: the same split is there (after PR B).
- Save a Ngày ăn mẫu, then `GET /api/v1/day-templates` lists it.

## Rollback

Down migrations, in reverse order. **First** put back the API that does not read the new columns (`deploy/deploy.sh <previous-tag>`). Otherwise `GET /me` answers 500 once the columns are gone.

```bash
( echo 'BEGIN;'; cat migrations/000016_day_templates.down.sql migrations/000015_profiles_target_settings.down.sql; echo 'COMMIT;' ) |
  docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q'
```

- `000016` down drops `nutrition.day_templates` with every saved template. The devices still hold their own copy, and the web uploads it again once the table is back, but take a `pg_dump --table=nutrition.day_templates` first if the rows matter.
- `000015` down drops the trigger, the function and the five columns. `updated_at` stays (it is 000002's). The settings are lost on the server only; each device keeps its own.
- Restoring the backup instead: `gunzip -c ~/backups/prod-before-000015-*.sql.gz | docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL"'` into an emptied `nutrition` schema. Only if the down migrations are not enough.
