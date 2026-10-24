-- 000021_profile_level.down.sql: back to no Level on the server (every Level an admin set is lost; the web then shows Level 0).
ALTER TABLE nutrition.profiles DROP CONSTRAINT IF EXISTS profiles_level_seen_check;
ALTER TABLE nutrition.profiles DROP CONSTRAINT IF EXISTS profiles_level_check;
ALTER TABLE nutrition.profiles DROP COLUMN IF EXISTS level_seen;
ALTER TABLE nutrition.profiles DROP COLUMN IF EXISTS level;
