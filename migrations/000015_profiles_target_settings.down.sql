-- 000015_profiles_target_settings.down.sql
-- updated_at stays: it belongs to 000002.
DROP TRIGGER IF EXISTS trg_profiles_touch_updated_at ON nutrition.profiles;
DROP FUNCTION IF EXISTS nutrition.touch_updated_at();
ALTER TABLE nutrition.profiles
  DROP CONSTRAINT IF EXISTS profiles_macro_mode_check,
  DROP CONSTRAINT IF EXISTS profiles_macro_ratios_check,
  DROP CONSTRAINT IF EXISTS profiles_macro_fixed_check,
  DROP CONSTRAINT IF EXISTS profiles_custom_energy_kcal_check,
  DROP CONSTRAINT IF EXISTS profiles_custom_targets_check,
  DROP COLUMN IF EXISTS macro_mode,
  DROP COLUMN IF EXISTS macro_ratios,
  DROP COLUMN IF EXISTS macro_fixed,
  DROP COLUMN IF EXISTS custom_energy_kcal,
  DROP COLUMN IF EXISTS custom_targets;
