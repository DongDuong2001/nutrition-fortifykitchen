-- Protein audit 23/10/2026: five rows move to a new source key (same id, so the import updates them instead of inserting a second row),
-- and one wrong duplicate is archived. Run this BEFORE the import: the import upserts on (source, source_id).
-- As committed it ends in ROLLBACK (look at the two SELECTs and the 6 UPDATE 1 lines); to apply it, run it again with the last line changed to COMMIT.
-- Rows: Thịt bò nạc -> usda_sr_legacy / FDC 171779; Ức gà phi lê -> usda_sr_legacy / FDC 171077:uc-ga-phi-le; Đậu hũ trắng, Tàu hủ trắng cứng (hấp/luộc), Hến -> vn_nin;
-- Mực (USDA squid, FDC 174223) -> archived: the NIN row Mực ống (NIN 8040) is the same food, and the USDA row is 26 % higher in kcal.
-- Archiving only hides it from search and the library; nothing is deleted.
\set ON_ERROR_STOP on

BEGIN;

SELECT id, name_vi, source, source_id, is_archived FROM nutrition.foods WHERE id IN ('b1cb7f07-0c3b-440c-a453-4147e5471e35', 'b6c88da5-5f97-43a1-8b90-4f3d9325affb', '245172d0-9a1a-4f8c-8991-148e6236893c', '03bcdfd2-fc3a-4bd4-a31a-3df56e772639', 'd2960a7c-f75a-47dc-8b1a-1c1e4c9d3fd4', '6028095b-11f8-40e8-9dd5-2b87bda06c1e') ORDER BY name_vi;

UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 171779'
WHERE id = 'b1cb7f07-0c3b-440c-a453-4147e5471e35' AND source = 'usda_foundation' AND source_id = 'food-thit-bo-nac';  -- Thịt bò nạc
UPDATE nutrition.foods SET source = 'usda_sr_legacy', source_id = 'FDC 171077:uc-ga-phi-le'
WHERE id = 'b6c88da5-5f97-43a1-8b90-4f3d9325affb' AND source = 'usda_foundation' AND source_id = 'food-uc-ga';  -- Ức gà phi lê
UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 3025'
WHERE id = '245172d0-9a1a-4f8c-8991-148e6236893c' AND source = 'vn_table' AND source_id = 'food-dau-hu';  -- Đậu hũ trắng
UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 3025002'
WHERE id = '03bcdfd2-fc3a-4bd4-a31a-3df56e772639' AND source = 'usda_sr_legacy' AND source_id = 'FDC 172475:tau-hu-trang-hap-luoc';  -- Tàu hủ trắng cứng (hấp/luộc)
UPDATE nutrition.foods SET source = 'vn_nin', source_id = 'NIN 8037'
WHERE id = 'd2960a7c-f75a-47dc-8b1a-1c1e4c9d3fd4' AND source = 'asean' AND source_id = 'PhilFCT G020';  -- Hến
UPDATE nutrition.foods SET is_archived = true
WHERE id = '6028095b-11f8-40e8-9dd5-2b87bda06c1e' AND source = 'usda_sr_legacy' AND source_id = 'FDC 174223' AND is_archived = false;  -- Mực (duplicate of Mực ống, NIN 8040)

SELECT id, name_vi, source, source_id, is_archived FROM nutrition.foods WHERE id IN ('b1cb7f07-0c3b-440c-a453-4147e5471e35', 'b6c88da5-5f97-43a1-8b90-4f3d9325affb', '245172d0-9a1a-4f8c-8991-148e6236893c', '03bcdfd2-fc3a-4bd4-a31a-3df56e772639', 'd2960a7c-f75a-47dc-8b1a-1c1e4c9d3fd4', '6028095b-11f8-40e8-9dd5-2b87bda06c1e') ORDER BY name_vi;

ROLLBACK;
