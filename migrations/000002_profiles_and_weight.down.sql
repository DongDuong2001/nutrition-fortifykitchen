-- 000002_profiles_and_weight.down.sql

DROP POLICY IF EXISTS "Users can manage own weight logs" ON nutrition.weight_logs;
DROP POLICY IF EXISTS "Users can manage own profile" ON nutrition.profiles;

DROP TABLE IF EXISTS nutrition.weight_logs;
DROP TABLE IF EXISTS nutrition.profiles;
