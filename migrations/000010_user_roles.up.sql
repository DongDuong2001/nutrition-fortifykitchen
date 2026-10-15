-- 000010_user_roles.up.sql

-- 1. Add role column to profiles with default 'user' and valid check constraint
ALTER TABLE nutrition.profiles 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' 
CHECK (role IN ('user', 'coach', 'admin'));

-- 2. Create coach_applications table
CREATE TABLE IF NOT EXISTS nutrition.coach_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  specialty TEXT NOT NULL,
  experience_years INT NOT NULL DEFAULT 1 CHECK (experience_years >= 0),
  message TEXT NOT NULL DEFAULT '',
  social_link TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user application lookup and admin status filtering
CREATE INDEX IF NOT EXISTS idx_coach_apps_user ON nutrition.coach_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_apps_status ON nutrition.coach_applications(status);

-- 3. Row Level Security policies
ALTER TABLE nutrition.coach_applications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can insert own coach application" ON nutrition.coach_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own coach applications" ON nutrition.coach_applications
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins full management of coach applications" ON nutrition.coach_applications
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM nutrition.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
