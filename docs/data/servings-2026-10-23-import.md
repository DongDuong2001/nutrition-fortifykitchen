# Import of the 23/10/2026 servings fix: Hao's server steps

Data job `data/servings-1023` (for review, not merged, **nothing imported**). The file has 3 rows, **3 updates** of rows already live (Matcha, Matcha Satoen, Hạt Brazil: same `source` + `source_id`, so the importer's `ON CONFLICT (source, source_id) DO UPDATE` rewrites them; no row is inserted). It changes only the order and content of their servings: the first serving becomes the spoon or the nut instead of 100 g. See `docs/data/servings-2026-10-23.md`.

**Diary entries already logged keep their old numbers.** An entry stores its own snapshot when it is written (`nutrients_snapshot`, `name_snapshot`, `calories`, `portion_label`, `grams`), so nothing in the past changes.

Same server set-up as `docs/data/new-foods-2026-10-21-import.md`: repo in `/var/www/nutrition-meals`, database (Postgres 17, Supabase) through `DATABASE_URL` in `deploy/.env.prod`. The VPS has **no Go** and its `pg_dump` is **16**, so every command runs in a throw-away container (`golang:1.24-alpine`, `postgres:17-alpine`).

## 0. Put the data files on the server (outside the repo checkout)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin data/servings-1023
git show origin/data/servings-1023:docs/data/servings-2026-10-23.json > ~/servings-2026-10-23.json
git show origin/data/servings-1023:docs/data/servings-2026-10-23-before.json > ~/servings-2026-10-23-before.json
python3 -c "import json; print(len(json.load(open('/home/deploy/servings-2026-10-23.json'))), 'rows')"
```

It must print `3 rows`. (After the merge, `git pull --ff-only` and use the files in `docs/data/`.)

## 1. Back up `nutrition.foods` and `nutrition.food_portions` first

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions' \
  | gzip -9 > ~/backups/foods-before-servings-1023.sql.gz
gunzip -c ~/backups/foods-before-servings-1023.sql.gz | grep -c '^INSERT INTO nutrition.foods '
```

Expected count: 1,306 (the live count read on 23/10; if the server has more rows by then, that is fine: the import adds none). Keep the file until the import is checked.

## 2. Dry run (parse and completeness report, no database write)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
docker run --rm --network host -v "$PWD":/src -v ~/servings-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
```

Expected (the dry run does not open the database, so it cannot tell insert from update):

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 3 food records from /data/x.json
Completeness Report: 93.9% average coverage of the 22 counted nutrients across 3 foods
```

## 3. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/servings-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

Expected last line: `Successfully imported 3 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output; a re-run is safe (same upsert, portions replaced per food).

## 4. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT f.name_vi, f.per_100g->>'energy' AS kcal_100g, string_agg(p.label_vi || ' = ' || p.grams, '; ' ORDER BY p.sort) AS portions
FROM nutrition.foods f LEFT JOIN nutrition.food_portions p ON p.food_id = f.id
WHERE (f.source, f.source_id) IN (
  ('literature', 'STFCJ 5th rev. ed. 2005, Beverages, matcha (MEXT item 16_16035_6)'),
  ('literature', 'STFCJ 5th rev. ed. 2005, Beverages, matcha (MEXT item 16_16035_6):matcha-satoen-bot'),
  ('usda_sr_legacy', 'FDC 170569')
) GROUP BY f.id ORDER BY f.name_vi;
SELECT count(*) FROM nutrition.foods;
SQL
```

Expected: Hạt Brazil `1 hạt = 5; 100 g = 100; 1 nắm = 28`, Matcha `1 muỗng cà phê = 2; 100 g = 100`, Matcha Satoen `1 muỗng cà phê = 2; 100 g = 100`, with the same kcal per 100 g as before (Matcha and Satoen 324, Hạt Brazil 659), and the foods count unchanged (1,306 unless other rows were added meanwhile).

## Rolling back

No row is inserted, so there is nothing to delete. Re-import the before-file (the three rows with the servings they had on 23/10; same upsert):

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/servings-2026-10-23-before.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

The dump from step 1 is only for the unexpected (`gunzip -c ~/backups/foods-before-servings-1023.sql.gz | grep '<source_id>'`); do not restore the whole dump over the live tables.
