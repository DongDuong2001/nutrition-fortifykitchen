-- 000009_foods_plain_unique_index.up.sql
-- Replace partial unique index with plain unique index on foods (source, source_id)
-- Required for ON CONFLICT (source, source_id) clause without predicate in importfoods

DROP INDEX IF EXISTS nutrition.uq_foods_source_source_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_foods_source_source_id
ON nutrition.foods (source, source_id);
