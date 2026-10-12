-- 000006_rls_hardening.down.sql

DROP POLICY IF EXISTS "Users can manage own custom foods" ON nutrition.foods;
DROP POLICY IF EXISTS "Public foods are viewable by all authenticated users" ON nutrition.foods;
ALTER TABLE nutrition.foods DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own diary logs" ON nutrition.diary_logs;
