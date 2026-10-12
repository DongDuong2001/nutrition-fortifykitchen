-- 000004_diary_core.down.sql

DROP POLICY IF EXISTS "Users can manage own day training" ON nutrition.day_training;
DROP TABLE IF EXISTS nutrition.day_training;

DROP INDEX IF EXISTS nutrition.idx_diary_logs_active_user_date;

ALTER TABLE nutrition.diary_logs
    DROP CONSTRAINT IF EXISTS chk_diary_logs_food_id,
    DROP CONSTRAINT IF EXISTS chk_diary_logs_kind;

-- Revert columns
ALTER TABLE nutrition.diary_logs
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS client_id,
    DROP COLUMN IF EXISTS name_snapshot,
    DROP COLUMN IF EXISTS calories,
    DROP COLUMN IF EXISTS grams,
    DROP COLUMN IF EXISTS portion_label,
    DROP COLUMN IF EXISTS kind;
