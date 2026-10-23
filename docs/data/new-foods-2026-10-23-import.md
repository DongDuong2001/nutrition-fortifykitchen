# Import of the 23/10/2026 foods: Hao's server steps

Data job `data/foods-1023` (for review, not merged, nothing imported). The file `docs/data/new-foods-2026-10-23.json` has **36 rows, all new**: no row of the live catalogue is updated, so the importer only inserts (`ON CONFLICT (source, source_id)` never fires). It uses the importer already on `main` (`apps/api/cmd/importfoods`, unchanged). The API's foods total goes from **1306** (read 23/10) to **1342**.

Same server set-up as `docs/data/new-foods-2026-10-21b-import.md`: repo in `/var/www/nutrition-meals`, database (Postgres 17, Supabase) through `DATABASE_URL` in `deploy/.env.prod`. The VPS has no Go and its `pg_dump` is 16, so every command runs in a throw-away container with `--network host`: `postgres:17-alpine` for `pg_dump` and `psql`, `golang:1.24-alpine` for the importer, `DATABASE_URL` passed as `-e DATABASE_URL`. Do the steps in order and stop at the first one that fails.

Sources used by the new rows are all known to the web app (`usda_sr_legacy`, `usda_fndds` → USDA; `vn_nin` → Bảng TPDD Việt Nam; `recipe_calc` → Ước tính), so no web deploy is needed for the labels.

## 0. Put the data file on the server (outside the repo checkout)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin data/foods-1023
git show origin/data/foods-1023:docs/data/new-foods-2026-10-23.json > ~/new-foods-2026-10-23.json
python3 -c "import json; print(len(json.load(open('/home/deploy/new-foods-2026-10-23.json'))), 'rows')"
```

It must print `36 rows`. (After the merge, `git pull --ff-only` and use `docs/data/new-foods-2026-10-23.json`.)

## 1. Back up `nutrition.foods` and `nutrition.food_portions` first

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions' \
  | gzip -9 > ~/backups/foods-before-1023.sql.gz
gunzip -c ~/backups/foods-before-1023.sql.gz | grep -c '^INSERT INTO nutrition.foods '
```

Write down the count it prints (call it **B**): the database count after the import must be **B + 36**. (The `GET /api/v1/foods` total is smaller than the database count; on 23/10 it is 1306, and it must read **1342** after the import.) Keep the file until the import is checked.

## 2. Dry run (parse and completeness report, no database write)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
docker run --rm --network host -v "$PWD":/src -v ~/new-foods-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
```

Expected:

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 36 food records from /data/x.json
Completeness Report: 49.1% average coverage of the 22 counted nutrients across 36 foods
```

## 3. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/new-foods-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

Expected last line: `Successfully imported 36 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output; a re-run is safe (same upsert, portions replaced per food).

## 4. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT count(*) AS new_rows FROM nutrition.foods WHERE (source, source_id) IN (
  ('usda_sr_legacy', 'FDC 171278'),
  ('usda_sr_legacy', 'FDC 172884'),
  ('usda_sr_legacy', 'FDC 172883'),
  ('usda_fndds', 'FDC 2708708'),
  ('usda_fndds', 'FDC 2708724'),
  ('label', 'lottemart.vn/product/ca-nuc-sot-ca-lilly-155g-8935105810167-p4395 (ảnh nhãn đọc 2026-10-23)'),
  ('label', 'world.openfoodfacts.org/product/8938501141019 (ảnh nhãn đọc 2026-10-23)'),
  ('recipe_calc', 'recipe:meatcool-thit-heo-xay-it-mo'),
  ('vn_nin', 'NIN 15006'),
  ('vn_nin', 'NIN 15077'),
  ('vn_nin', 'NIN 15030'),
  ('vn_nin', 'NIN 15015'),
  ('vn_nin', 'NIN 15021'),
  ('vn_nin', 'NIN 15032'),
  ('vn_nin', 'NIN 15004'),
  ('vn_nin', 'NIN 15070'),
  ('vn_nin', 'NIN 15071'),
  ('vn_nin', 'NIN 15014'),
  ('vn_nin', 'NIN 15031'),
  ('vn_nin', 'NIN 15058'),
  ('vn_nin', 'NIN 7070'),
  ('vn_nin', 'NIN 7068'),
  ('vn_nin', 'NIN 15008'),
  ('vn_nin', 'NIN 12005'),
  ('vn_nin', 'NIN 1041:banh-da-kho'),
  ('vn_nin', 'NIN 1041002:banh-da-luoc'),
  ('recipe_calc', 'recipe:canh-bau'),
  ('recipe_calc', 'recipe:canh-bi-xanh'),
  ('recipe_calc', 'recipe:canh-cai-ngot'),
  ('recipe_calc', 'recipe:canh-bap-cai'),
  ('recipe_calc', 'recipe:banh-da-cua'),
  ('recipe_calc', 'recipe:bun-thang'),
  ('recipe_calc', 'recipe:bun-ca-hai-phong'),
  ('recipe_calc', 'recipe:canh-cua-rau-day'),
  ('recipe_calc', 'recipe:pho-xao-bo'),
  ('recipe_calc', 'recipe:pho-cuon')
);
SELECT count(*) AS foods_total FROM nutrition.foods;
SQL
curl -s 'https://lehongkhanh.vn/api/v1/foods?limit=1' | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['total'])"
```

Expected: `new_rows` = **36**, `foods_total` = **B + 36**, and the API total **1342**.

## Rolling back

All rows are new, so rolling back is deleting them. Portions go with the food (check the foreign key first with `\d nutrition.food_portions`; if there is no `ON DELETE CASCADE`, delete the portions first).

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
BEGIN;
DELETE FROM nutrition.food_portions WHERE food_id IN (SELECT id FROM nutrition.foods WHERE (source, source_id) IN (
  ('usda_sr_legacy', 'FDC 171278'),
  ('usda_sr_legacy', 'FDC 172884'),
  ('usda_sr_legacy', 'FDC 172883'),
  ('usda_fndds', 'FDC 2708708'),
  ('usda_fndds', 'FDC 2708724'),
  ('label', 'lottemart.vn/product/ca-nuc-sot-ca-lilly-155g-8935105810167-p4395 (ảnh nhãn đọc 2026-10-23)'),
  ('label', 'world.openfoodfacts.org/product/8938501141019 (ảnh nhãn đọc 2026-10-23)'),
  ('recipe_calc', 'recipe:meatcool-thit-heo-xay-it-mo'),
  ('vn_nin', 'NIN 15006'),
  ('vn_nin', 'NIN 15077'),
  ('vn_nin', 'NIN 15030'),
  ('vn_nin', 'NIN 15015'),
  ('vn_nin', 'NIN 15021'),
  ('vn_nin', 'NIN 15032'),
  ('vn_nin', 'NIN 15004'),
  ('vn_nin', 'NIN 15070'),
  ('vn_nin', 'NIN 15071'),
  ('vn_nin', 'NIN 15014'),
  ('vn_nin', 'NIN 15031'),
  ('vn_nin', 'NIN 15058'),
  ('vn_nin', 'NIN 7070'),
  ('vn_nin', 'NIN 7068'),
  ('vn_nin', 'NIN 15008'),
  ('vn_nin', 'NIN 12005'),
  ('vn_nin', 'NIN 1041:banh-da-kho'),
  ('vn_nin', 'NIN 1041002:banh-da-luoc'),
  ('recipe_calc', 'recipe:canh-bau'),
  ('recipe_calc', 'recipe:canh-bi-xanh'),
  ('recipe_calc', 'recipe:canh-cai-ngot'),
  ('recipe_calc', 'recipe:canh-bap-cai'),
  ('recipe_calc', 'recipe:banh-da-cua'),
  ('recipe_calc', 'recipe:bun-thang'),
  ('recipe_calc', 'recipe:bun-ca-hai-phong'),
  ('recipe_calc', 'recipe:canh-cua-rau-day'),
  ('recipe_calc', 'recipe:pho-xao-bo'),
  ('recipe_calc', 'recipe:pho-cuon')
));
DELETE FROM nutrition.foods WHERE (source, source_id) IN (
  ('usda_sr_legacy', 'FDC 171278'),
  ('usda_sr_legacy', 'FDC 172884'),
  ('usda_sr_legacy', 'FDC 172883'),
  ('usda_fndds', 'FDC 2708708'),
  ('usda_fndds', 'FDC 2708724'),
  ('label', 'lottemart.vn/product/ca-nuc-sot-ca-lilly-155g-8935105810167-p4395 (ảnh nhãn đọc 2026-10-23)'),
  ('label', 'world.openfoodfacts.org/product/8938501141019 (ảnh nhãn đọc 2026-10-23)'),
  ('recipe_calc', 'recipe:meatcool-thit-heo-xay-it-mo'),
  ('vn_nin', 'NIN 15006'),
  ('vn_nin', 'NIN 15077'),
  ('vn_nin', 'NIN 15030'),
  ('vn_nin', 'NIN 15015'),
  ('vn_nin', 'NIN 15021'),
  ('vn_nin', 'NIN 15032'),
  ('vn_nin', 'NIN 15004'),
  ('vn_nin', 'NIN 15070'),
  ('vn_nin', 'NIN 15071'),
  ('vn_nin', 'NIN 15014'),
  ('vn_nin', 'NIN 15031'),
  ('vn_nin', 'NIN 15058'),
  ('vn_nin', 'NIN 7070'),
  ('vn_nin', 'NIN 7068'),
  ('vn_nin', 'NIN 15008'),
  ('vn_nin', 'NIN 12005'),
  ('vn_nin', 'NIN 1041:banh-da-kho'),
  ('vn_nin', 'NIN 1041002:banh-da-luoc'),
  ('recipe_calc', 'recipe:canh-bau'),
  ('recipe_calc', 'recipe:canh-bi-xanh'),
  ('recipe_calc', 'recipe:canh-cai-ngot'),
  ('recipe_calc', 'recipe:canh-bap-cai'),
  ('recipe_calc', 'recipe:banh-da-cua'),
  ('recipe_calc', 'recipe:bun-thang'),
  ('recipe_calc', 'recipe:bun-ca-hai-phong'),
  ('recipe_calc', 'recipe:canh-cua-rau-day'),
  ('recipe_calc', 'recipe:pho-xao-bo'),
  ('recipe_calc', 'recipe:pho-cuon')
);
COMMIT;
SQL
```

Diary entries already logged keep their own snapshot, so nothing in the past changes if the rows are removed. The dump from step 1 is only for the unexpected; do not restore the whole dump over the live tables (the rows are already there and the inserts would collide).
