-- 000012_custom_foods_archive.up.sql
-- Soft-archive custom foods when deleted so existing diary logs maintain FK RESTRICT integrity
ALTER TABLE nutrition.foods ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_foods_is_archived ON nutrition.foods (is_archived) WHERE is_archived = true;
