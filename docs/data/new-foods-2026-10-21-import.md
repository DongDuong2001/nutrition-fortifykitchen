# Import of the 21/10/2026 foods: Hao's server steps

**Status: imported 21/10/2026 12:00** (Hao, with the Docker commands below; foods 1,406 → 1,424). PR #39 stays unmerged until it joins the merge train after #36.

Data job `data/foods-1021`. The file has 18 rows, all new: no row of the live catalogue is updated, so the importer only inserts (`ON CONFLICT (source, source_id)` never fires). Import it with the importer that is already on `main` (`apps/api/cmd/importfoods`, unchanged).

Where the server keeps the repo and the database: `/var/www/nutrition-meals`, database = Supabase through `DATABASE_URL` in `deploy/.env.prod` (`docs/deploy.md`).

## What the VPS needs (learned on 21/10)

- **No Go on the VPS.** The importer runs in a throw-away Docker container (`golang:1.24-alpine`, the version in `apps/api/go.mod`).
- **`pg_dump` on the VPS is 16, the database is 17**, and `pg_dump` refuses a newer server. `pg_dump` and `psql` run from `postgres:17-alpine` instead.
- Every container uses `--network host` and gets `DATABASE_URL` from the shell (`-e DATABASE_URL`, no value on the command line), so the URL never appears in the process list or in this file.
- The same pattern works for the earlier data files (`docs/data/new-foods-2026-10-20*.md`, `fix-*-2026-10-20*.md`): replace the file name, keep the rest.

Do the steps in order and stop at the first one that fails. The "Fortify Kitchen" search tag and food-page source name come from the web commit on this branch (`lib/source-names.ts`): until it is deployed the eight `fortify_kitchen` rows show "Chưa rõ" as their source; the numbers are the same. Importing the data does not need a web deploy.

## 0. Put the data file on the server (outside the repo checkout)

Until the PR is merged, take the file from the branch (this leaves the checkout on `main` untouched, so `deploy/deploy.sh` still works):

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin data/foods-1021
git show origin/data/foods-1021:docs/data/new-foods-2026-10-21.json > ~/new-foods-2026-10-21.json
python3 -c "import json; print(len(json.load(open('/home/deploy/new-foods-2026-10-21.json'))), 'rows')"
```

It must print `18 rows`. (After the merge, `git pull --ff-only` and use `docs/data/new-foods-2026-10-21.json` instead.)

## 1. Back up `nutrition.foods` and `nutrition.food_portions` first

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c   'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions'   | gzip -9 > ~/backups/foods-before-1021.sql.gz
gunzip -c ~/backups/foods-before-1021.sql.gz | grep -c '^INSERT INTO nutrition.foods '
```

The last line counts the foods in the dump: **1,406** on 21/10 (the table also holds custom foods, so it is more than the 1,281 the public list shows). Note the number; keep the file until the import is checked.

## 2. Dry run (parse and completeness report, no database write)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
docker run --rm --network host -v "$PWD":/src -v ~/new-foods-2026-10-21.json:/data/x.json:ro -w /src/apps/api   golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
```

Expected (a dry run never opens the database; the first run also downloads the Go modules):

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 18 food records from /data/x.json
Completeness Report: 74.2% average coverage of the 22 counted nutrients across 18 foods
```

## 3. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/new-foods-2026-10-21.json:/data/x.json:ro -w /src/apps/api   golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

Expected last line: `Successfully imported 18 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output; a re-run is safe (upsert on `source` + `source_id`, portions replaced per food).

## 4. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT source, count(*) FROM nutrition.foods WHERE (source, source_id) IN (
  ('label', 'thegarlicfarm.co.uk/products/black-garlic-ready-to-eat-cloves (đọc 2026-10-21)'),
  ('usda_sr_legacy', 'FDC 168156:nuoc-cot-chanh-ta'),
  ('usda_sr_legacy', 'FDC 168156:nuoc-cot-chanh-khong-hat'),
  ('usda_sr_legacy', 'FDC 167747:nuoc-cot-chanh-vang'),
  ('usda_sr_legacy', 'FDC 169108:ruot-chanh-day'),
  ('recipe_calc', 'recipe:cha-ram-quang-binh-chien-khong-dau'),
  ('recipe_calc', 'recipe:cha-ram-quang-binh-chien-dau'),
  ('label', 'cocoavia.com/products/500mg-cocoa-flavanols-powder (đọc 2026-10-21)'),
  ('label', 'cocoavia.com/products/500mg-cocoa-flavanols-powder-stick-packs (đọc 2026-10-21)'),
  ('label', 'EasyGYM Bánh Bông Lean - nhãn sản phẩm (ảnh chụp 2026-10-21)'),
  ('fortify_kitchen', 'fortify_kitchen:ga-ma-dui-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:uc-ga-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:tom-su-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:tom-the-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:than-bo-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:sot-ca-chua-nuong'),
  ('fortify_kitchen', 'fortify_kitchen:mi-y-sot-ca'),
  ('fortify_kitchen', 'fortify_kitchen:bo-ham')
) GROUP BY source ORDER BY source;
SELECT count(*) FROM nutrition.foods;
SQL
```

Expected: `fortify_kitchen` 8, `label` 4, `recipe_calc` 2, `usda_sr_legacy` 4 (total 18), then the foods count: **1,424** (1,406 + 18) on 21/10.

## Rolling back

All 18 rows are new, so rolling back means deleting exactly those rows. Their portions go with them (`food_portions.food_id` is `ON DELETE CASCADE`).

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
DELETE FROM nutrition.foods WHERE (source, source_id) IN (
  ('label', 'thegarlicfarm.co.uk/products/black-garlic-ready-to-eat-cloves (đọc 2026-10-21)'),
  ('usda_sr_legacy', 'FDC 168156:nuoc-cot-chanh-ta'),
  ('usda_sr_legacy', 'FDC 168156:nuoc-cot-chanh-khong-hat'),
  ('usda_sr_legacy', 'FDC 167747:nuoc-cot-chanh-vang'),
  ('usda_sr_legacy', 'FDC 169108:ruot-chanh-day'),
  ('recipe_calc', 'recipe:cha-ram-quang-binh-chien-khong-dau'),
  ('recipe_calc', 'recipe:cha-ram-quang-binh-chien-dau'),
  ('label', 'cocoavia.com/products/500mg-cocoa-flavanols-powder (đọc 2026-10-21)'),
  ('label', 'cocoavia.com/products/500mg-cocoa-flavanols-powder-stick-packs (đọc 2026-10-21)'),
  ('label', 'EasyGYM Bánh Bông Lean - nhãn sản phẩm (ảnh chụp 2026-10-21)'),
  ('fortify_kitchen', 'fortify_kitchen:ga-ma-dui-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:uc-ga-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:tom-su-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:tom-the-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:than-bo-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:sot-ca-chua-nuong'),
  ('fortify_kitchen', 'fortify_kitchen:mi-y-sot-ca'),
  ('fortify_kitchen', 'fortify_kitchen:bo-ham')
);
SQL
```

It prints `DELETE 18`; the foods count is then back to 1,406.

- If a user has already logged one of these foods, the diary's foreign key (`ON DELETE RESTRICT`, migration 000001) refuses the delete of that row and the whole statement fails: leave that row, or ask Dong to hide it.
- Nothing existing is modified by this import, so the dump from step 1 is only needed if something unexpected changed. It holds every `nutrition.foods` and `nutrition.food_portions` row as an `INSERT` with column names: find the row (`gunzip -c ~/backups/foods-before-1021.sql.gz | grep '<source_id>'`), delete the damaged live row, and run its `INSERT` lines again through `psql` (same `docker run` as in step 4). Do not restore the whole dump over the live tables: the rows are already there and the inserts would collide.
