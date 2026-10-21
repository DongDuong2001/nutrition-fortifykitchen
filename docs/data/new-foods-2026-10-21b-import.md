# Import of the 21/10/2026 (b) foods: Hao's server steps

Data job `data/foods-1021b` (PR for review, not merged, nothing imported). The file has 2 rows (Bánh khoai nướng Minh Hào, two yogurt variants), both new: no live row is updated, so the importer only inserts. It uses the importer already on `main` (`apps/api/cmd/importfoods`, unchanged); the `fortify_kitchen` source code is already deployed code on `main` (PR #39).

Same server set-up as `docs/data/new-foods-2026-10-21-import.md`: repo in `/var/www/nutrition-meals`, database (Postgres 17, Supabase) through `DATABASE_URL` in `deploy/.env.prod`. The VPS has **no Go** and its `pg_dump` is **16** (older than the server), so every command runs in a throw-away container with `--network host`: `postgres:17-alpine` for `pg_dump` and `psql`, `golang:1.24-alpine` for the importer, with `DATABASE_URL` passed as `-e DATABASE_URL` (no value on the command line). Do the steps in order and stop at the first one that fails.

## 0. Put the data file on the server (outside the repo checkout)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
git fetch origin data/foods-1021b
git show origin/data/foods-1021b:docs/data/new-foods-2026-10-21b.json > ~/new-foods-2026-10-21b.json
python3 -c "import json; print(len(json.load(open('/home/deploy/new-foods-2026-10-21b.json'))), 'rows')"
```

It must print `2 rows`. (After the merge, `git pull --ff-only` and use `docs/data/new-foods-2026-10-21b.json`.)

## 1. Back up `nutrition.foods` and `nutrition.food_portions` first

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
mkdir -p ~/backups
docker run --rm --network host -e DATABASE_URL postgres:17-alpine sh -c \
  'pg_dump "$DATABASE_URL" --data-only --column-inserts --no-owner --no-acl --table=nutrition.foods --table=nutrition.food_portions' \
  | gzip -9 > ~/backups/foods-before-1021b.sql.gz
gunzip -c ~/backups/foods-before-1021b.sql.gz | grep -c '^INSERT INTO nutrition.foods '
```

Note the count (it was 1,424 after the first 21/10 import); after this import it is +2.

## 2. Dry run (parse and completeness report, no database write)

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
docker run --rm --network host -v "$PWD":/src -v ~/new-foods-2026-10-21b.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --dry-run --file /data/x.json
```

Expected:

```
=== H1T MICRO Food Catalog Importer ===
Mode: DRY RUN (No database changes will be saved)
Loaded 2 food records from /data/x.json
Completeness Report: 90.9% average coverage of the 22 counted nutrients across 2 foods
```

## 3. The import

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm --network host -e DATABASE_URL -v "$PWD":/src -v ~/new-foods-2026-10-21b.json:/data/x.json:ro -w /src/apps/api \
  golang:1.24-alpine go run ./cmd/importfoods --file /data/x.json
```

Expected last line: `Successfully imported 2 foods into nutrition.foods`. A row that fails prints `Error inserting food ...` and the run goes on, so read the output; a re-run is safe (upsert on `source` + `source_id`, portions replaced per food).

## 4. Check

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
SELECT source, count(*) FROM nutrition.foods WHERE (source, source_id) IN (
  ('fortify_kitchen', 'fortify_kitchen:banh-khoai-nuong-sua-chua-thuong'),
  ('fortify_kitchen', 'fortify_kitchen:banh-khoai-nuong-sua-chua-hy-lap')
) GROUP BY source;
SELECT count(*) FROM nutrition.foods;
SQL
```

Expected: `fortify_kitchen` 2, then the foods count from step 1 plus 2.

## Rolling back

Both rows are new, so rolling back means deleting exactly them (their portions go with them: `food_portions.food_id` is `ON DELETE CASCADE`).

```bash
ssh deploy@14.225.210.185
cd /var/www/nutrition-meals
export DATABASE_URL="$(grep -E '^DATABASE_URL=' deploy/.env.prod | cut -d= -f2- | tr -d '"')"
docker run --rm -i --network host -e DATABASE_URL postgres:17-alpine sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1' <<'SQL'
DELETE FROM nutrition.foods WHERE (source, source_id) IN (
  ('fortify_kitchen', 'fortify_kitchen:banh-khoai-nuong-sua-chua-thuong'),
  ('fortify_kitchen', 'fortify_kitchen:banh-khoai-nuong-sua-chua-hy-lap')
);
SQL
```

It prints `DELETE 2`. If a user has already logged one of the rows, the diary's foreign key (`ON DELETE RESTRICT`) refuses the delete and the statement fails: leave that row, or ask Dong to hide it. Nothing existing is modified by this import; the dump from step 1 is only for the unexpected (find the row with `gunzip -c ~/backups/foods-before-1021b.sql.gz | grep '<source_id>'` and re-run its `INSERT` lines through `psql`). Do not restore the whole dump over the live tables: the rows are already there and the inserts would collide.
