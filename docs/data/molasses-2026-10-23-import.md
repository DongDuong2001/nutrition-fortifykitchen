# Import of the 23/10/2026 molasses rows: Hao's server steps

Data job `data/molasses-1023` (PR #84, merged) plus the source fix `data/molasses-1023-source-fix`. The file has 5 records: **2 updates** (Golden Barrel blackstrap, Brer Rabbit Full Flavor, the old "Mật mía Rabbit") and **3 inserts** (Grandma's Original, Brer Rabbit Mild, Brer Rabbit Blackstrap). Details and sources: `docs/data/molasses-2026-10-23.md`.

**Order matters: backup, then the source-fix SQL, then the import.** The import upserts on `(source, source_id)`. The Full Flavor record carries `label` / `Brer Rabbit Full Flavor Molasses label, bgfoods.com (archive 2025-11-16), read 2026-10-23`, but the live row (`6598c0aa-06bb-42e3-a00d-37a248a6360a`) still has `usda_sr_legacy` / `FDC 168820:mat-mia-rabbit-song`. Imported before the SQL, the record would insert a second "Mật mía Brer Rabbit Full Flavor" row and leave the old one behind.

**Diary entries already logged keep their old numbers.** An entry stores its own snapshot (`nutrients_snapshot`, `name_snapshot`, `calories`, `portion_label`, `grams`), so nothing in the past changes.

Same server set-up as `docs/data/servings-2026-10-23-import.md`: repo in `/var/www/nutrition-meals`, database (Postgres 17, Supabase) through `DATABASE_URL` in `deploy/.env.prod`. The VPS has no Go and its `pg_dump` is 16, so every command runs in a throw-away container (`golang:1.24-alpine`, `postgres:17-alpine`).

## 0. Put the files on the server (outside the repo checkout)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin main
git show origin/main:docs/data/molasses-2026-10-23.json > ~/molasses-2026-10-23.json
git show origin/main:docs/data/molasses-2026-10-23-source-fix.sql > ~/molasses-2026-10-23-source-fix.sql
python3 -c "import json; print(len(json.load(open('/home/deploy/molasses-2026-10-23.json'))), 'rows')"
grep -c "archive 2025-11-16" ~/molasses-2026-10-23.json ~/molasses-2026-10-23-source-fix.sql
```

It must print `5 rows`, then `1` for the JSON and `1` for the SQL (the same `source_id` in both). This works once the source-fix PR is merged; before that, use `git fetch origin data/molasses-1023-source-fix` and `git show origin/data/molasses-1023-source-fix:docs/data/…`.

## 1. Back up `nutrition.foods` and `nutrition.food_portions` first

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions' \
  | gzip -9 > ~/backups/foods-before-molasses-1023.sql.gz
gunzip -c ~/backups/foods-before-molasses-1023.sql.gz | grep -c '^INSERT INTO nutrition.foods '
```

**Write down the number it prints: it is N, the real count before the import.** (The 23/10 snapshot had 1,306; use what the server says, not that.) Keep the file until the import is checked.

## 2. The source-fix SQL: ROLLBACK first, then COMMIT

First as committed, which ends in `ROLLBACK` (nothing is saved):

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL"' < ~/molasses-2026-10-23-source-fix.sql
```

Expected: `BEGIN`; the first SELECT shows one row, `Mật mía Rabbit`, `usda_sr_legacy`, `FDC 168820:mat-mia-rabbit-song`; `UPDATE 1`; the second SELECT shows the same id with `label` and `Brer Rabbit Full Flavor Molasses label, bgfoods.com (archive 2025-11-16), read 2026-10-23`; `ROLLBACK`. **If it says `UPDATE 0` or the first SELECT is empty or shows something else, stop**: the row is not what this job expects.

When that is right, run the same file with the last statement changed to `COMMIT` (the file is not edited, `sed` does it on the way in):

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
sed 's/^ROLLBACK;$/COMMIT;/' ~/molasses-2026-10-23-source-fix.sql \
  | docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL"'
```

Expected: the same output ending in `COMMIT`. Running it a second time is harmless: the `WHERE … AND source = 'usda_sr_legacy'` matches nothing then (`UPDATE 0`) and the first SELECT already shows `label`.

## 3. Dry run (parse and completeness report, no database write)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
docker run --rm --network host -v "$PWD":/src -v ~/molasses-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
```

Expected (the dry run does not open the database, so it cannot tell insert from update):

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 5 food records from /data/x.json
Completeness Report: 25.5% average coverage of the 22 counted nutrients across 5 foods
```

## 4. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/molasses-2026-10-23.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

Expected last line: `Successfully imported 5 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output; a re-run is safe (same upsert, portions replaced per food).

## 5. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT f.id, f.name_vi, f.source, f.brand, f.per_100g->>'energy' AS kcal_100g, f.per_100g->>'carbs' AS carbs_100g,
       f.per_100g->>'calcium' AS ca_100g, string_agg(p.label_vi || ' = ' || p.grams, '; ' ORDER BY p.sort) AS portions
FROM nutrition.foods f LEFT JOIN nutrition.food_portions p ON p.food_id = f.id
WHERE f.name_vi LIKE 'Mật mía Golden Barrel%' OR f.name_vi LIKE 'Mật mía Grandma%' OR f.name_vi LIKE 'Mật mía Brer Rabbit%' OR f.name_vi = 'Mật mía Rabbit'
GROUP BY f.id ORDER BY f.name_vi;
SELECT count(*) FROM nutrition.foods;
SQL
```

Expected: exactly 5 rows, each with `1 muỗng canh = 20; 100 g = 100` and kcal 300:

| name_vi | source | carbs | Ca | id |
|---|---|---|---|---|
| Mật mía Brer Rabbit Blackstrap | label | 70 | 950 | new |
| Mật mía Brer Rabbit Full Flavor | label | 80 | 400 | `6598c0aa-06bb-42e3-a00d-37a248a6360a` (the same id as before) |
| Mật mía Brer Rabbit Mild Flavor | label | 80 | 300 | new |
| Mật mía Golden Barrel (blackstrap) | label | 70 | 1040 | `a26731bf-4d86-44dd-bd9d-32c1c41405be` (the same id as before) |
| Mật mía Grandma's Original (unsulphured) | label | 80 | 150 | new |

There must be **no** row named `Mật mía Rabbit` (it is now Full Flavor) and only one Full Flavor row; two would mean the import ran before the SQL. The count must be **N + 3**, where N is the number step 1 printed (the real count before the import, not a fixed number): the import adds exactly the 3 new rows.

## Rolling back

- **The three new rows:** delete them by their `source` + `source_id` (their portions go with them, `ON DELETE CASCADE`; a diary entry that already points at one blocks the delete, `ON DELETE RESTRICT`, so check first):

  ```sql
  DELETE FROM nutrition.foods WHERE source = 'label' AND source_id IN (
    'Grandma''s Original Molasses (unsulphured) label, grandmasmolasses.com, read 2026-10-23',
    'Brer Rabbit Mild Flavor Molasses label, bgfoods.com (Wayback copy 2025-11-16), read 2026-10-23',
    'Brer Rabbit Blackstrap Molasses label, bgfoods.com (Wayback copy 2025-12-14), read 2026-10-23');
  ```

- **The two updated rows:** their old values are in the review sheet (section "Before (live, 23/10)" of rows 1 and 3) and in the dump of step 1 (`gunzip -c ~/backups/foods-before-molasses-1023.sql.gz | grep -e a26731bf -e 6598c0aa`). For Full Flavor also put the old source back first: `UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 168820:mat-mia-rabbit-song' WHERE id = '6598c0aa-06bb-42e3-a00d-37a248a6360a';`. Do not restore the whole dump over the live tables.
