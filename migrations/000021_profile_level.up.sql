-- 000021_profile_level.up.sql
-- The user's own Level (0–5) on the profile, so every device and the live app show the real one (before this, nobody had
-- a Level on the server and the live app showed Level 0 to everyone).
--   level      : set by an admin or a coach (today by SQL, see docs/runbooks/migrate-1023.md; later the coach screens),
--                never by the user: the API refuses a profile save that sends it.
--   level_seen : the last Level the user was shown the Level-up celebration or card for. The user's own save may set it
--                (0–5); one above their level is stored as the level (LEAST in apps/api/internal/profile UpsertProfile).
-- Existing rows get 0 and 0. Numbers 000019 and 000020 are left for the documents and custom-food jobs of 23/10.
ALTER TABLE nutrition.profiles
  ADD COLUMN IF NOT EXISTS level SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level_seen SMALLINT NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE nutrition.profiles ADD CONSTRAINT profiles_level_check CHECK (level BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE nutrition.profiles ADD CONSTRAINT profiles_level_seen_check CHECK (level_seen BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
