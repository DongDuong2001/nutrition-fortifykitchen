-- Training minutes (feat/training-custom-minutes, #77): Tùy chỉnh picks any time from 30 to 480 minutes in 30-minute steps.
-- The rule, the same in the API (apps/api/internal/targets ValidTrainingMinutes): 0 (rest), the 45-minute preset, or a multiple
-- of 30 from 30 to 480. Every value the old checks took (0, 45, 60, 90, 120, 240) still passes.
ALTER TABLE nutrition.profiles DROP CONSTRAINT IF EXISTS profiles_training_minutes_default_check;
ALTER TABLE nutrition.profiles ADD CONSTRAINT profiles_training_minutes_default_check
  CHECK (training_minutes_default = 45 OR (training_minutes_default BETWEEN 0 AND 480 AND training_minutes_default % 30 = 0));

ALTER TABLE nutrition.day_training DROP CONSTRAINT IF EXISTS day_training_minutes_check;
ALTER TABLE nutrition.day_training ADD CONSTRAINT day_training_minutes_check
  CHECK (minutes = 45 OR (minutes BETWEEN 0 AND 480 AND minutes % 30 = 0));
