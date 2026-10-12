-- 000002_profiles_and_weight.up.sql

CREATE TABLE IF NOT EXISTS nutrition.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
  birth_year INT NOT NULL CHECK (birth_year BETWEEN 1920 AND 2015),
  weight_kg NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 25 AND 300),
  goal TEXT NOT NULL CHECK (goal IN ('build', 'maintain', 'cut', 'deep_cut')),
  training_minutes_default INT NOT NULL DEFAULT 60 CHECK (training_minutes_default IN (0, 45, 60, 90, 120, 240)),
  near_period BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'vi',
  reminders JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrition.weight_logs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  weight_kg NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 25 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, log_date)
);

-- RLS policies
ALTER TABLE nutrition.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.weight_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own profile" ON nutrition.profiles
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage own weight logs" ON nutrition.weight_logs
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
