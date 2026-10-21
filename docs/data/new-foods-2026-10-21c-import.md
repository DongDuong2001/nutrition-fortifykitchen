# Import of the 21/10/2026 (c) foods: Hao's server steps

Branch `feat/ui-cc-khoai-swaps` (PR for review, not merged, nothing imported). The file has 7 rows, all new: 6 ingredient foods the catalogue lacked (Chiết xuất vani, Siro cây phong, Bột hạnh nhân, Bột nở, Chocolate đen 70–85 %, Sữa chua thường nguyên kem) and Bánh khoai nướng Minh Hào. No live row is updated, so the importer only inserts. Expected foods count: **1,424 → 1,431** (+7; PR #40's three updates do not change the count). It uses the importer already on `main` (`apps/api/cmd/importfoods`, unchanged).

**Order:** import this file first, then deploy the web change (the recipe is in the app; it finds its ingredients in the catalogue by `source|source_id`).

Same server set-up as `docs/data/new-foods-2026-10-21-import.md`: repo in `/var/www/nutrition-meals`, database (Postgres 17, Supabase) through `DATABASE_URL` in `deploy/.env.prod`. The VPS has **no Go** and its `pg_dump` is **16** (older than the server), so every command runs in a throw-away container with `--network host`: `postgres:17-alpine` for `pg_dump` and `psql`, `golang:1.24-alpine` for the importer, with `DATABASE_URL` passed as `-e DATABASE_URL`. Do the steps in order and stop at the first one that fails.

## 0. Put the data file on the server (outside the repo checkout)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin feat/ui-cc-khoai-swaps
git show origin/feat/ui-cc-khoai-swaps:docs/data/new-foods-2026-10-21c.json > ~/new-foods-2026-10-21c.json
python3 -c "import json; print(len(json.load(open('/home/deploy/new-foods-2026-10-21c.json'))), 'rows')"
```

It must print `7 rows`. (After the merge, `git pull --ff-only` and use `docs/data/new-foods-2026-10-21c.json`.)

## 1. Back up `nutrition.foods` and `nutrition.food_portions` first

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions' \
  | gzip -9 > ~/backups/foods-before-1021d.sql.gz
gunzip -c ~/backups/foods-before-1021d.sql.gz | grep -c '^INSERT INTO nutrition.foods '
```

Expected count: 1,424. Keep the file until the import is checked.

## 2. Dry run (parse and completeness report, no database write)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
docker run --rm --network host -v "$PWD":/src -v ~/new-foods-2026-10-21c.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
```

Expected:

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 7 food records from /data/x.json
Completeness Report: 92.2% average coverage of the 22 counted nutrients across 7 foods
```

## 3. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/new-foods-2026-10-21c.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

Expected last line: `Successfully imported 7 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output; a re-run is safe (upsert on `source` + `source_id`, portions replaced per food).

## 4. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT source, count(*) FROM nutrition.foods WHERE (source, source_id) IN (
  ('usda_sr_legacy', 'FDC 173471'),
  ('usda_sr_legacy', 'FDC 169661'),
  ('usda_foundation', 'FDC 2261420'),
  ('usda_sr_legacy', 'FDC 172803'),
  ('usda_sr_legacy', 'FDC 170273'),
  ('usda_sr_legacy', 'FDC 171284'),
  ('fortify_kitchen', 'fortify_kitchen:banh-khoai-nuong')
) GROUP BY source ORDER BY source;
SELECT count(*) FROM nutrition.foods;
SQL
```

Expected: `fortify_kitchen` 1, `usda_foundation` 1, `usda_sr_legacy` 5 (total 7), then the foods count **1,431**.

## Rolling back

All 7 rows are new, so rolling back means deleting exactly them (their portions go with them: `food_portions.food_id` is `ON DELETE CASCADE`). Roll back the web deploy first if it is already live: the cake's Thành phần would show its parts without kcal.

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
DELETE FROM nutrition.foods WHERE (source, source_id) IN (
  ('usda_sr_legacy', 'FDC 173471'),
  ('usda_sr_legacy', 'FDC 169661'),
  ('usda_foundation', 'FDC 2261420'),
  ('usda_sr_legacy', 'FDC 172803'),
  ('usda_sr_legacy', 'FDC 170273'),
  ('usda_sr_legacy', 'FDC 171284'),
  ('fortify_kitchen', 'fortify_kitchen:banh-khoai-nuong')
);
SQL
```

It prints `DELETE 7`. If a user has already logged the cake, the diary's foreign key (`ON DELETE RESTRICT`) refuses the delete and the statement fails: leave that row, or ask Dong to hide it. Nothing existing is modified by this import; the dump from step 1 is only for the unexpected (find the row with `gunzip -c ~/backups/foods-before-1021d.sql.gz | grep '<source_id>'`). Do not restore the whole dump over the live tables.
