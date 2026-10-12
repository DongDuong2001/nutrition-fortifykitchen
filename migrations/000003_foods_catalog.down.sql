-- 000003_foods_catalog.down.sql

DROP INDEX IF EXISTS nutrition.idx_foods_rich_fiber;
DROP INDEX IF EXISTS nutrition.idx_foods_rich_protein;
DROP INDEX IF EXISTS nutrition.idx_foods_rich_vitamin_d;
DROP INDEX IF EXISTS nutrition.idx_foods_rich_zinc;
DROP INDEX IF EXISTS nutrition.idx_foods_rich_magnesium;
DROP INDEX IF EXISTS nutrition.idx_foods_rich_potassium;
DROP INDEX IF EXISTS nutrition.idx_foods_rich_iron;
DROP INDEX IF EXISTS nutrition.idx_foods_rich_calcium;

DROP INDEX IF EXISTS nutrition.idx_food_portions_food_id;
DROP INDEX IF EXISTS nutrition.idx_foods_source_source_id;
DROP INDEX IF EXISTS nutrition.idx_foods_category;
DROP INDEX IF EXISTS nutrition.idx_foods_name_search_trgm;

DROP TABLE IF EXISTS nutrition.food_portions;

DROP TRIGGER IF EXISTS trg_sync_food_name_search ON nutrition.foods;
DROP FUNCTION IF EXISTS nutrition.sync_food_name_search();

ALTER TABLE nutrition.foods
    DROP COLUMN IF EXISTS per_100g,
    DROP COLUMN IF EXISTS tip_vi,
    DROP COLUMN IF EXISTS brand,
    DROP COLUMN IF EXISTS source_id,
    DROP COLUMN IF EXISTS source,
    DROP COLUMN IF EXISTS name_search,
    DROP COLUMN IF EXISTS name_vi,
    DROP COLUMN IF EXISTS category;

DROP TABLE IF EXISTS nutrition.nutrients;
