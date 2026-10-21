# Import of the 21/10/2026 (b, c) foods: Hao's server steps

Data job `data/foods-1021b` (PR #40, for review, not merged, nothing imported). The file has 3 rows, **3 updates** of rows already imported on 21/10 (Sốt cà chua nướng, Mì Ý sốt cà, Bò hầm Minh Hào: same `source` + `source_id`, so the importer's `ON CONFLICT (source, source_id) DO UPDATE` rewrites their nutrients, portions and `tip_vi`; name, category and brand are unchanged). It uses the importer already on `main` (`apps/api/cmd/importfoods`, unchanged). No new row: the foods count stays **1,424**.

**Diary entries already logged keep their old numbers.** An entry stores its own snapshot when it is written (`nutrients_snapshot`, `name_snapshot`, `calories`, `portion_label`, `grams`), so nothing in the past changes; only entries logged after the import use the new values and portions.

Same server set-up as `docs/data/new-foods-2026-10-21-import.md`: repo in `/var/www/nutrition-meals`, database (Postgres 17, Supabase) through `DATABASE_URL` in `deploy/.env.prod`. The VPS has **no Go** and its `pg_dump` is **16** (older than the server), so every command runs in a throw-away container with `--network host`: `postgres:17-alpine` for `pg_dump` and `psql`, `golang:1.24-alpine` for the importer, with `DATABASE_URL` passed as `-e DATABASE_URL`. Do the steps in order and stop at the first one that fails.

## 0. Put the data file on the server (outside the repo checkout)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin data/foods-1021b
git show origin/data/foods-1021b:docs/data/new-foods-2026-10-21b.json > ~/new-foods-2026-10-21b.json
python3 -c "import json; print(len(json.load(open('/home/deploy/new-foods-2026-10-21b.json'))), 'rows')"
```

It must print `3 rows`. (After the merge, `git pull --ff-only` and use `docs/data/new-foods-2026-10-21b.json`.)

## 1. Back up `nutrition.foods` and `nutrition.food_portions` first (the three updates change existing rows)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions' \
  | gzip -9 > ~/backups/foods-before-1021c.sql.gz
gunzip -c ~/backups/foods-before-1021c.sql.gz | grep -c '^INSERT INTO nutrition.foods '
```

Expected count: 1,424. Keep the file until the import is checked.

## 2. Dry run (parse and completeness report, no database write)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
docker run --rm --network host -v "$PWD":/src -v ~/new-foods-2026-10-21b.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
```

Expected (the dry run does not open the database, so it cannot tell insert from update):

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 3 food records from /data/x.json
Completeness Report: 89.4% average coverage of the 22 counted nutrients across 3 foods
```

## 3. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/new-foods-2026-10-21b.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

Expected last line: `Successfully imported 3 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output; a re-run is safe (same upsert, portions replaced per food).

## 4. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT f.name_vi, f.per_100g->>'energy' AS kcal_100g, f.tip_vi, string_agg(p.label_vi || ' = ' || p.grams, '; ' ORDER BY p.sort) AS portions
FROM nutrition.foods f LEFT JOIN nutrition.food_portions p ON p.food_id = f.id
WHERE (f.source, f.source_id) IN (
  ('fortify_kitchen', 'fortify_kitchen:sot-ca-chua-nuong'),
  ('fortify_kitchen', 'fortify_kitchen:mi-y-sot-ca'),
  ('fortify_kitchen', 'fortify_kitchen:bo-ham')
) GROUP BY f.id ORDER BY f.name_vi;
SELECT count(*) FROM nutrition.foods;
SQL
```

Expected: 3 rows with the kcal/100 g and portions of the sheet's "Old → new" table (new columns), and the foods count still **1,424**.

## Rolling back

No row is inserted, so there is nothing to delete.

- **The 3 updates:** re-import the previous file, which holds their old values (upsert again). The 21/10 file is on `main` (`docs/data/new-foods-2026-10-21.json`); it also re-writes the other 15 rows of that file with the values they already have, so nothing else changes.

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git show origin/main:docs/data/new-foods-2026-10-21.json > ~/new-foods-2026-10-21.json
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/new-foods-2026-10-21.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

The dump from step 1 is only for the unexpected: it holds every `nutrition.foods` and `nutrition.food_portions` row as an `INSERT` with column names (`gunzip -c ~/backups/foods-before-1021c.sql.gz | grep '<source_id>'`). Do not restore the whole dump over the live tables: the rows are already there and the inserts would collide.
