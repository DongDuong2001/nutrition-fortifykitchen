-- Protein follow-up 23/10/2026: three rows move to the NIN rows of their cooked partners (same id, so the import updates them instead of inserting a second row),
-- and one wrong duplicate (USDA Cá nục (nấu chín)) is archived. Run this BEFORE the import: the import upserts on (source, source_id).
-- As committed it ends in ROLLBACK (look at the two SELECTs and the 4 UPDATE 1 lines); to apply it, run it again with the last line changed to COMMIT.
-- Rows: Ba chỉ heo (sống) -> NIN 7018, Cá nục (sống) -> NIN 8020, Chân giò heo (sống) -> NIN 7032. Hao accepted the nutrient losses of these three (23/10): the USDA rows were the wrong food.
-- Archiving Cá nục (nấu chín) only hides it from search and the library; nothing is deleted.
-- Runs after the protein-audit-2026-10-23 SQL and import (it assumes their result).
\set ON_ERROR_STOP on

BEGIN;

SELECT id, name_vi, source, source_id, is_archived FROM nutrition.foods WHERE id IN ('ca083cb1-a4d1-4d42-8ab0-99df3b41fbf0', 'baa7ce9f-03e6-4b60-a25a-9ef41155abb9', 'c6950aa7-e519-417a-a4f7-b68957960a83', '6a8848b1-1ba9-4506-b41f-d28af941e6cb') ORDER BY name_vi;

UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 7018'
WHERE id = 'ca083cb1-a4d1-4d42-8ab0-99df3b41fbf0' AND source = 'usda_sr_legacy' AND source_id = 'FDC 167812';  -- Ba chỉ heo (sống)
UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 8020'
WHERE id = 'baa7ce9f-03e6-4b60-a25a-9ef41155abb9' AND source = 'usda_sr_legacy' AND source_id = 'FDC 173672';  -- Cá nục (sống)
UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 7032'
WHERE id = 'c6950aa7-e519-417a-a4f7-b68957960a83' AND source = 'usda_sr_legacy' AND source_id = 'FDC 168226';  -- Chân giò heo (sống)
UPDATE nutrition.foods SET is_archived = true
WHERE id = '6a8848b1-1ba9-4506-b41f-d28af941e6cb' AND source = 'usda_sr_legacy' AND source_id = 'FDC 171994' AND is_archived = false;  -- Cá nục (nấu chín) (duplicate of the NIN Cá nục luộc / nướng rows)

SELECT id, name_vi, source, source_id, is_archived FROM nutrition.foods WHERE id IN ('ca083cb1-a4d1-4d42-8ab0-99df3b41fbf0', 'baa7ce9f-03e6-4b60-a25a-9ef41155abb9', 'c6950aa7-e519-417a-a4f7-b68957960a83', '6a8848b1-1ba9-4506-b41f-d28af941e6cb') ORDER BY name_vi;

ROLLBACK;
