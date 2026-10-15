-- 000010_user_roles.down.sql

DROP TABLE IF EXISTS nutrition.coach_applications CASCADE;
ALTER TABLE nutrition.profiles DROP COLUMN IF EXISTS role;
