# Import of the 21/10/2026 foods: Hao's server steps

Data job `data/foods-1021` (PR for review, not merged, nothing imported). The file has 17 rows, all new: no row of the live catalogue is updated, so the importer only inserts (`ON CONFLICT (source, source_id)` never fires). Import it with the importer that is already on `main` (`apps/api/cmd/importfoods`, unchanged).

Where the server keeps the repo and the database: `/var/www/nutrition-meals`, database = Supabase through `DATABASE_URL` in `deploy/.env.prod` (`docs/deploy.md`). I did not log in to the server, so the paths and the tools below (`pg_dump`, `psql`, `go` or Docker) are not checked there. Do the steps in order and stop at the first one that fails.

The "Fortify Kitchen" search tag and food-page source name come from the web commit on this branch (`lib/source-names.ts`). Until that is deployed the eight `fortify_kitchen` rows show "Chưa rõ" as their source; the numbers are the same. Importing the data does not need a web deploy.

## 0. Put the data file on the server (outside the repo checkout)

Until the PR is merged, take the file from the branch (this leaves the checkout on `main` untouched, so `deploy/deploy.sh` still works):

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin data/foods-1021
git show origin/data/foods-1021:docs/data/new-foods-2026-10-21.json > ~/new-foods-2026-10-21.json
python3 -c "import json; print(len(json.load(open('/home/deploy/new-foods-2026-10-21.json'))), 'rows')"
```

It must print `17 rows`. (After the merge, `git pull --ff-only` and use `docs/data/new-foods-2026-10-21.json` instead.)

## 1. Back up `nutrition.foods` and `nutrition.food_portions` first

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl \
  --table=nutrition.foods --table=nutrition.food_portions | gzip -9 > ~/backups/foods-before-1021.sql.gz
gunzip -c ~/backups/foods-before-1021.sql.gz | grep -c '^INSERT INTO nutrition.foods '
```

The last line counts the foods in the dump. Note the number (the public list had 1,281 foods on 21/10, and the table may also hold custom foods the list does not show). Keep the file until the import is checked.

## 2. Dry run (parse and completeness report, no database write)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals/apps/api
go run ./cmd/importfoods --dry-run --file ~/new-foods-2026-10-21.json
```

Expected (a dry run never opens the database):

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 17 food records from /home/deploy/new-foods-2026-10-21.json
Completeness Report: 68.4% average coverage of the 22 counted nutrients across 17 foods
```

If `go` is not installed on the server, the same command in Docker (the API image does not contain the importer):

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals/apps/api
docker run --rm -v "$PWD":/src -v ~/new-foods-2026-10-21.json:/data/new-foods.json:ro -w /src golang:1.24-alpine \
  go run ./cmd/importfoods --dry-run --file /data/new-foods.json
```

## 3. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals/apps/api
export DATABASE_URL="$(grep -E '^DATABASE_URL=' ../../deploy/.env.prod | cut -d= -f2- | tr -d '"')"
go run ./cmd/importfoods --file ~/new-foods-2026-10-21.json
```

Expected last line: `Successfully imported 17 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output; a re-run is safe (upsert on `source` + `source_id`, portions replaced per food). With Docker add `-e DATABASE_URL="$DATABASE_URL"` to the `docker run` above and drop `--dry-run`.

## 4. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
psql "$DATABASE_URL" -c "SELECT source, count(*) FROM nutrition.foods WHERE (source, source_id) IN (
  ('label', 'thegarlicfarm.co.uk/products/black-garlic-ready-to-eat-cloves (đọc 2026-10-21)'),
  ('usda_sr_legacy', 'FDC 168156:nuoc-cot-chanh-ta'),
  ('usda_sr_legacy', 'FDC 168156:nuoc-cot-chanh-khong-hat'),
  ('usda_sr_legacy', 'FDC 167747:nuoc-cot-chanh-vang'),
  ('usda_sr_legacy', 'FDC 169108:ruot-chanh-day'),
  ('recipe_calc', 'recipe:cha-ram-quang-binh-chien-khong-dau'),
  ('recipe_calc', 'recipe:cha-ram-quang-binh-chien-dau'),
  ('label', 'cocoavia.com/products/500mg-cocoa-flavanols-powder (đọc 2026-10-21)'),
  ('label', 'cocoavia.com/products/500mg-cocoa-flavanols-powder-stick-packs (đọc 2026-10-21)'),
  ('fortify_kitchen', 'fortify_kitchen:ga-ma-dui-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:uc-ga-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:tom-su-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:tom-the-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:than-bo-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:sot-ca-chua-nuong'),
  ('fortify_kitchen', 'fortify_kitchen:mi-y-sot-ca'),
  ('fortify_kitchen', 'fortify_kitchen:bo-ham')
) GROUP BY source ORDER BY source;"
```

Expected: `fortify_kitchen` 8, `label` 3, `recipe_calc` 2, `usda_sr_legacy` 4 (total 17). Running the grep count of step 1 again on a fresh dump gives the old number + 17.

## Rolling back

All 17 rows are new, so rolling back means deleting exactly those rows. Their portions go with them (`food_portions.food_id` is `ON DELETE CASCADE`).

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DELETE FROM nutrition.foods WHERE (source, source_id) IN (
  ('label', 'thegarlicfarm.co.uk/products/black-garlic-ready-to-eat-cloves (đọc 2026-10-21)'),
  ('usda_sr_legacy', 'FDC 168156:nuoc-cot-chanh-ta'),
  ('usda_sr_legacy', 'FDC 168156:nuoc-cot-chanh-khong-hat'),
  ('usda_sr_legacy', 'FDC 167747:nuoc-cot-chanh-vang'),
  ('usda_sr_legacy', 'FDC 169108:ruot-chanh-day'),
  ('recipe_calc', 'recipe:cha-ram-quang-binh-chien-khong-dau'),
  ('recipe_calc', 'recipe:cha-ram-quang-binh-chien-dau'),
  ('label', 'cocoavia.com/products/500mg-cocoa-flavanols-powder (đọc 2026-10-21)'),
  ('label', 'cocoavia.com/products/500mg-cocoa-flavanols-powder-stick-packs (đọc 2026-10-21)'),
  ('fortify_kitchen', 'fortify_kitchen:ga-ma-dui-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:uc-ga-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:tom-su-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:tom-the-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:than-bo-nau-cham'),
  ('fortify_kitchen', 'fortify_kitchen:sot-ca-chua-nuong'),
  ('fortify_kitchen', 'fortify_kitchen:mi-y-sot-ca'),
  ('fortify_kitchen', 'fortify_kitchen:bo-ham')
);"
```

It prints `DELETE 17`. Check the foods count (step 1's count on a fresh dump) is back to the number you noted.

- If a user has already logged one of these foods, the diary's foreign key (`ON DELETE RESTRICT`, migration 000001) refuses the delete of that row and the whole statement fails: leave that row, or ask Dong to hide it.
- Nothing existing is modified by this import, so the dump from step 1 is only needed if something unexpected changed. It holds every `nutrition.foods` and `nutrition.food_portions` row as an `INSERT` with column names: find the row (`gunzip -c ~/backups/foods-before-1021.sql.gz | grep '<source_id>'`), delete the damaged live row, and run its `INSERT` lines again through `psql`. Do not restore the whole dump over the live tables: the rows are already there and the inserts would collide.
