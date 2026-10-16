-- 000011_diary_nullable_calories.down.sql
ALTER TABLE nutrition.diary_logs ALTER COLUMN calories SET DEFAULT 0;
UPDATE nutrition.diary_logs SET calories = 0 WHERE calories IS NULL;
ALTER TABLE nutrition.diary_logs ALTER COLUMN calories SET NOT NULL;
