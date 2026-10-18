-- 000014_account_delete_cascade.up.sql
-- Cascade delete user's diary logs and targets when auth user is deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_diary_logs_user'
  ) THEN
    ALTER TABLE nutrition.diary_logs
      ADD CONSTRAINT fk_diary_logs_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_targets_user'
  ) THEN
    ALTER TABLE nutrition.user_targets
      ADD CONSTRAINT fk_user_targets_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
