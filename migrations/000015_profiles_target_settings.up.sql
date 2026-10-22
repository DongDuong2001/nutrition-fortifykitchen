-- 000015_profiles_target_settings.up.sql
-- The macro split, the custom kcal and the custom vitamin/mineral targets, stored with the profile so every device of
-- the account has them. NULL = not set: the app uses the coach formula. Shapes are checked here as well as in the API.
ALTER TABLE nutrition.profiles
  ADD COLUMN IF NOT EXISTS macro_mode TEXT,
  ADD COLUMN IF NOT EXISTS macro_ratios JSONB,
  ADD COLUMN IF NOT EXISTS macro_fixed JSONB,
  ADD COLUMN IF NOT EXISTS custom_energy_kcal INTEGER,
  ADD COLUMN IF NOT EXISTS custom_targets JSONB,
  -- Already there since 000002; kept so this migration also stands on its own
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE nutrition.profiles ADD CONSTRAINT profiles_macro_mode_check
    CHECK (macro_mode IN ('default', 'ratios', 'fixed', 'keto'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- {"proteinPct":25,"carbsPct":55,"fatPct":20}: each 0–100, together 100 (±1)
DO $$ BEGIN
  ALTER TABLE nutrition.profiles ADD CONSTRAINT profiles_macro_ratios_check CHECK (
    macro_ratios IS NULL OR (
      jsonb_typeof(macro_ratios) = 'object'
      AND jsonb_typeof(macro_ratios->'proteinPct') = 'number'
      AND jsonb_typeof(macro_ratios->'carbsPct') = 'number'
      AND jsonb_typeof(macro_ratios->'fatPct') = 'number'
      AND (macro_ratios->>'proteinPct')::numeric BETWEEN 0 AND 100
      AND (macro_ratios->>'carbsPct')::numeric BETWEEN 0 AND 100
      AND (macro_ratios->>'fatPct')::numeric BETWEEN 0 AND 100
      AND abs((macro_ratios->>'proteinPct')::numeric + (macro_ratios->>'carbsPct')::numeric
              + (macro_ratios->>'fatPct')::numeric - 100) <= 1
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- {"proteinGrams":150,"carbsGrams":200,"fatGrams":60}: each 0–1000
DO $$ BEGIN
  ALTER TABLE nutrition.profiles ADD CONSTRAINT profiles_macro_fixed_check CHECK (
    macro_fixed IS NULL OR (
      jsonb_typeof(macro_fixed) = 'object'
      AND jsonb_typeof(macro_fixed->'proteinGrams') = 'number'
      AND jsonb_typeof(macro_fixed->'carbsGrams') = 'number'
      AND jsonb_typeof(macro_fixed->'fatGrams') = 'number'
      AND (macro_fixed->>'proteinGrams')::numeric BETWEEN 0 AND 1000
      AND (macro_fixed->>'carbsGrams')::numeric BETWEEN 0 AND 1000
      AND (macro_fixed->>'fatGrams')::numeric BETWEEN 0 AND 1000
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE nutrition.profiles ADD CONSTRAINT profiles_custom_energy_kcal_check
    CHECK (custom_energy_kcal BETWEEN 800 AND 8000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- {"<nutrient id>": amount}: the allowed ids (the 21 DRI vitamins and minerals) and amounts are checked by the API
DO $$ BEGIN
  ALTER TABLE nutrition.profiles ADD CONSTRAINT profiles_custom_targets_check
    CHECK (custom_targets IS NULL OR jsonb_typeof(custom_targets) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- updated_at on every update of a row, whoever writes it (the API, a weigh-in, an admin role change)
CREATE OR REPLACE FUNCTION nutrition.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_touch_updated_at ON nutrition.profiles;
CREATE TRIGGER trg_profiles_touch_updated_at
BEFORE UPDATE ON nutrition.profiles
FOR EACH ROW
EXECUTE FUNCTION nutrition.touch_updated_at();
