-- 000012_custom_foods_archive.down.sql
DROP INDEX IF EXISTS nutrition.idx_foods_is_archived;
ALTER TABLE nutrition.foods DROP COLUMN IF EXISTS is_archived;
