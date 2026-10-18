-- 000014_account_delete_cascade.down.sql
ALTER TABLE nutrition.diary_logs DROP CONSTRAINT IF EXISTS fk_diary_logs_user;
ALTER TABLE nutrition.user_targets DROP CONSTRAINT IF EXISTS fk_user_targets_user;
