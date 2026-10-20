-- remove-kefir-lowfat-2026-10-20.sql
-- For Dong. Keeps ONE kefir row. Read docs/data/fix-kefir-2026-10-20.md first.
--
-- Run ORDER: 1. import docs/data/fix-kefir-2026-10-20.json (importfoods --file), 2. this file.
--
-- keep = 9ae4f832-0675-47c8-9ec4-7a54c0e03525  usda_foundation / food-yogurt-kefir  (becomes "Kefir", then cnf / CNF 6291 here)
-- old  = 9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5  usda_sr_legacy  / FDC 170904          (Kefir, lowfat, plain, LIFEWAY: hidden here)
--
-- What it does, in one transaction:
--   (a) moves every reference from old to keep: diary_logs, user_favourites, user_recents, saved_meal_items
--       (nothing else in migrations/ points at nutrition.foods(id) except food_portions, which belongs to the food itself)
--   (b) hides old with is_archived = true (migration 000012; search, favourites, recents and saved meals all filter on it).
--       It is archived, not deleted, on purpose: the row keeps its key (usda_sr_legacy, FDC 170904), so a later import of
--       an old file that still has that record updates the hidden row and cannot bring a second kefir back.
--   (c) gives keep its real source: source = 'cnf', source_id = 'CNF 6291' (the importer cannot change the upsert key)
-- Diary entries keep their own nutrients_snapshot, name_snapshot and calories, so old entries do not change values.
--
-- It stops with an error if keep has not been imported yet (name_vi must already be 'Kefir').
-- It ends with ROLLBACK. Look at the counts, then change the last line to COMMIT and run it again.

BEGIN;

DO $$
DECLARE
    v_keep CONSTANT uuid := '9ae4f832-0675-47c8-9ec4-7a54c0e03525';
    v_old  CONSTANT uuid := '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM nutrition.foods WHERE id = v_old AND source = 'usda_sr_legacy' AND source_id = 'FDC 170904') THEN
        RAISE EXCEPTION 'old kefir row not found as usda_sr_legacy / FDC 170904 (already done?)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM nutrition.foods WHERE id = v_keep AND source = 'usda_foundation' AND source_id = 'food-yogurt-kefir') THEN
        RAISE EXCEPTION 'kept kefir row not found as usda_foundation / food-yogurt-kefir (already done?)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM nutrition.foods WHERE id = v_keep AND name_vi = 'Kefir') THEN
        RAISE EXCEPTION 'import docs/data/fix-kefir-2026-10-20.json first: the kept row is not named Kefir yet';
    END IF;
    IF EXISTS (SELECT 1 FROM nutrition.foods WHERE source = 'cnf' AND source_id = 'CNF 6291') THEN
        RAISE EXCEPTION 'a row with cnf / CNF 6291 already exists';
    END IF;
END $$;

-- BEFORE
SELECT 'before' AS step,
       (SELECT count(*) FROM nutrition.diary_logs       WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5') AS diary_old,
       (SELECT count(*) FROM nutrition.diary_logs       WHERE food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525') AS diary_keep,
       (SELECT count(*) FROM nutrition.user_favourites  WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5') AS fav_old,
       (SELECT count(*) FROM nutrition.user_favourites  WHERE food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525') AS fav_keep,
       (SELECT count(*) FROM nutrition.user_recents     WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5') AS recents_old,
       (SELECT count(*) FROM nutrition.user_recents     WHERE food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525') AS recents_keep,
       (SELECT count(*) FROM nutrition.saved_meal_items WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5') AS meal_items_old,
       (SELECT count(*) FROM nutrition.saved_meal_items WHERE food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525') AS meal_items_keep;

-- (a1) favourites: primary key (user_id, food_id), so copy across and drop the old rows
INSERT INTO nutrition.user_favourites (user_id, food_id, created_at)
SELECT user_id, '9ae4f832-0675-47c8-9ec4-7a54c0e03525'::uuid, created_at
FROM nutrition.user_favourites
WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5'
ON CONFLICT (user_id, food_id) DO NOTHING;
DELETE FROM nutrition.user_favourites WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5';

-- (a2) recents: same key; where a user has both, the more recent use wins. The old portion label ("1 chén (cup)") is not a
--      portion of the kept row, so it is cleared (last_grams stays).
INSERT INTO nutrition.user_recents (user_id, food_id, last_portion_label, last_grams, used_at)
SELECT user_id, '9ae4f832-0675-47c8-9ec4-7a54c0e03525'::uuid, NULL, last_grams, used_at
FROM nutrition.user_recents
WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5'
ON CONFLICT (user_id, food_id) DO UPDATE SET
    last_portion_label = CASE WHEN EXCLUDED.used_at > nutrition.user_recents.used_at THEN NULL ELSE nutrition.user_recents.last_portion_label END,
    last_grams         = CASE WHEN EXCLUDED.used_at > nutrition.user_recents.used_at THEN EXCLUDED.last_grams ELSE nutrition.user_recents.last_grams END,
    used_at            = GREATEST(EXCLUDED.used_at, nutrition.user_recents.used_at);
DELETE FROM nutrition.user_recents WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5';

-- (a3) saved meals: grams stay, the label is cleared for the same reason
UPDATE nutrition.saved_meal_items
SET food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525', portion_label = NULL
WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5';

-- (a4) diary: the entry keeps its own snapshot (name, calories, nutrients, portion label, grams); only the link moves
UPDATE nutrition.diary_logs
SET food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525'
WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5';

-- (a5) the import replaced the kept row's portions ("200 ml", "1 hộp", "100 g" became "1 ly (200 ml)", "100 g"):
--      clear a saved label that no longer exists, so no screen opens on a portion the food does not have
UPDATE nutrition.user_recents r SET last_portion_label = NULL
WHERE r.food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525' AND r.last_portion_label IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM nutrition.food_portions p WHERE p.food_id = r.food_id AND p.label_vi = r.last_portion_label);
UPDATE nutrition.saved_meal_items i SET portion_label = NULL
WHERE i.food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525' AND i.portion_label IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM nutrition.food_portions p WHERE p.food_id = i.food_id AND p.label_vi = i.portion_label);

-- (b) hide the low-fat row
UPDATE nutrition.foods SET is_archived = true WHERE id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5';

-- (c) the kept row's real source
UPDATE nutrition.foods SET source = 'cnf', source_id = 'CNF 6291' WHERE id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525';

-- AFTER: the *_old counts must be 0, the *_keep counts the sums of the before counts (less users who had both),
-- visible must be 1 row: Kefir / cnf / CNF 6291
SELECT 'after' AS step,
       (SELECT count(*) FROM nutrition.diary_logs       WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5') AS diary_old,
       (SELECT count(*) FROM nutrition.diary_logs       WHERE food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525') AS diary_keep,
       (SELECT count(*) FROM nutrition.user_favourites  WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5') AS fav_old,
       (SELECT count(*) FROM nutrition.user_favourites  WHERE food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525') AS fav_keep,
       (SELECT count(*) FROM nutrition.user_recents     WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5') AS recents_old,
       (SELECT count(*) FROM nutrition.user_recents     WHERE food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525') AS recents_keep,
       (SELECT count(*) FROM nutrition.saved_meal_items WHERE food_id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5') AS meal_items_old,
       (SELECT count(*) FROM nutrition.saved_meal_items WHERE food_id = '9ae4f832-0675-47c8-9ec4-7a54c0e03525') AS meal_items_keep;

SELECT id, name_vi, source, source_id, is_archived
FROM nutrition.foods
WHERE (source = 'cnf' AND source_id = 'CNF 6291') OR id = '9af00b4b-a3e7-43f3-b790-d4ab9e27a9d5'
ORDER BY is_archived;

SELECT count(*) AS visible_kefir_rows
FROM nutrition.foods
WHERE is_archived = false AND is_custom = false AND name_search ILIKE '%kefir%';

ROLLBACK;  -- change to COMMIT after checking the counts above
