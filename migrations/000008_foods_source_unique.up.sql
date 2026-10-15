-- 000008_foods_source_unique.up.sql
-- Add unique constraint for source and source_id to enable idempotent imports

CREATE UNIQUE INDEX IF NOT EXISTS uq_foods_source_source_id
ON nutrition.foods (source, source_id);
