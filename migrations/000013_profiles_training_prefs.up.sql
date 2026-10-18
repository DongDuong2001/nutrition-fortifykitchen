-- 000013_profiles_training_prefs.up.sql
-- Store Bự/Bé workout size and custom workout foods across devices
ALTER TABLE nutrition.profiles ADD COLUMN IF NOT EXISTS training_prefs JSONB NOT NULL DEFAULT '{}';
