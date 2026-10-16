-- 000011_diary_nullable_calories.up.sql
-- Allow diary_logs.calories to be NULL when unknown (never force 0)
ALTER TABLE nutrition.diary_logs ALTER COLUMN calories DROP NOT NULL;
ALTER TABLE nutrition.diary_logs ALTER COLUMN calories DROP DEFAULT;
