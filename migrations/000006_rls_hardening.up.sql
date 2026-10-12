-- 000006_rls_hardening.up.sql
-- Comprehensive Row Level Security on all nutrition user tables

-- 1. Ensure RLS is active on all user tables
ALTER TABLE nutrition.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.diary_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.day_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.user_favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.user_recents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.saved_meal_items ENABLE ROW LEVEL SECURITY;

-- 2. Diary logs RLS policy
DO $$ BEGIN
    CREATE POLICY "Users can manage own diary logs" ON nutrition.diary_logs
        FOR ALL USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Custom foods RLS policy (public foods are readable by all; custom foods manageable by creator)
ALTER TABLE nutrition.foods ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public foods are viewable by all authenticated users" ON nutrition.foods
        FOR SELECT USING (is_custom = false OR created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can manage own custom foods" ON nutrition.foods
        FOR ALL USING (is_custom = true AND created_by = auth.uid())
        WITH CHECK (is_custom = true AND created_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
