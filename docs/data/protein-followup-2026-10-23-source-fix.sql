-- Protein follow-up 23/10/2026: four rows move to the source of their raw/cooked partner rows (same id, so the import updates them instead of inserting a second row),
-- and one wrong duplicate (USDA Cá nục (nấu chín)) is archived. Run this BEFORE the import: the import upserts on (source, source_id).
-- As committed it ends in ROLLBACK (look at the two SELECTs and the 5 UPDATE 1 lines); to apply it, run it again with the last line changed to COMMIT.
-- Rows: Ba chỉ heo (sống), Cá nục (sống), Chân giò heo (sống) -> vn_nin (the NIN rows of their cooked partners); Cá lóc (cá quả, sống) -> usda_sr_legacy / FDC 173680:ca-loc-song
-- (USDA northern pike raw, the twin of the live cooked pike row). Archiving Cá nục (nấu chín) only hides it from search and the library; nothing is deleted.
-- Runs after the protein-audit-2026-10-23 SQL and import (it assumes their result).
\set ON_ERROR_STOP on

BEGIN;

SELECT id, name_vi, source, source_id, is_archived FROM nutrition.foods WHERE id IN ('ca083cb1-a4d1-4d42-8ab0-99df3b41fbf0', 'baa7ce9f-03e6-4b60-a25a-9ef41155abb9', 'c6950aa7-e519-417a-a4f7-b68957960a83', 'fa91a51f-7fe4-4bf7-81aa-3023ed58dec2', '6a8848b1-1ba9-4506-b41f-d28af941e6cb') ORDER BY name_vi;

UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 7018'
WHERE id = 'ca083cb1-a4d1-4d42-8ab0-99df3b41fbf0' AND source = 'usda_sr_legacy' AND source_id = 'FDC 167812';  -- Ba chỉ heo (sống)
UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 8020'
WHERE id = 'baa7ce9f-03e6-4b60-a25a-9ef41155abb9' AND source = 'usda_sr_legacy' AND source_id = 'FDC 173672';  -- Cá nục (sống)
UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 7032'
WHERE id = 'c6950aa7-e519-417a-a4f7-b68957960a83' AND source = 'usda_sr_legacy' AND source_id = 'FDC 168226';  -- Chân giò heo (sống)
UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 173680:ca-loc-song'
WHERE id = 'fa91a51f-7fe4-4bf7-81aa-3023ed58dec2' AND source = 'vn_nin' AND source_id = 'NIN 8022';  -- Cá lóc (cá quả, sống)
UPDATE nutrition.foods SET is_archived = true
WHERE id = '6a8848b1-1ba9-4506-b41f-d28af941e6cb' AND source = 'usda_sr_legacy' AND source_id = 'FDC 171994' AND is_archived = false;  -- Cá nục (nấu chín) (duplicate of the NIN Cá nục luộc / nướng rows)

SELECT id, name_vi, source, source_id, is_archived FROM nutrition.foods WHERE id IN ('ca083cb1-a4d1-4d42-8ab0-99df3b41fbf0', 'baa7ce9f-03e6-4b60-a25a-9ef41155abb9', 'c6950aa7-e519-417a-a4f7-b68957960a83', 'fa91a51f-7fe4-4bf7-81aa-3023ed58dec2', '6a8848b1-1ba9-4506-b41f-d28af941e6cb') ORDER BY name_vi;

ROLLBACK;
