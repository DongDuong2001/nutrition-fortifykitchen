-- 000009_foods_plain_unique_index.down.sql
-- Revert to partial unique index

DROP INDEX IF EXISTS nutrition.uq_foods_source_source_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_foods_source_source_id
ON nutrition.foods (source, source_id)
WHERE source IS NOT NULL AND source_id IS NOT NULL;
