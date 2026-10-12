-- 000003_foods_catalog.up.sql

CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Create nutrition.nutrients catalog table
CREATE TABLE IF NOT EXISTS nutrition.nutrients (
    key TEXT PRIMARY KEY,
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    unit TEXT NOT NULL,
    counted BOOLEAN NOT NULL DEFAULT false,
    group_key TEXT NOT NULL,
    depth INT NOT NULL DEFAULT 0,
    parent_id TEXT REFERENCES nutrition.nutrients(key),
    target_source TEXT NOT NULL DEFAULT 'none',
    sort INT NOT NULL DEFAULT 0
);

-- 2. Alter nutrition.foods table
ALTER TABLE nutrition.foods
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'mon_viet',
    ADD COLUMN IF NOT EXISTS name_vi TEXT,
    ADD COLUMN IF NOT EXISTS name_search TEXT,
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'custom',
    ADD COLUMN IF NOT EXISTS source_id TEXT,
    ADD COLUMN IF NOT EXISTS brand TEXT,
    ADD COLUMN IF NOT EXISTS tip_vi TEXT,
    ADD COLUMN IF NOT EXISTS per_100g JSONB;

-- Update existing rows in nutrition.foods to initialize columns
UPDATE nutrition.foods
SET name_vi = COALESCE(name_vi, name),
    name_search = COALESCE(name_search, lower(unaccent(name))),
    per_100g = COALESCE(per_100g, per_100g_nutrients)
WHERE name_search IS NULL;

-- Trigger to keep name_search automatically in sync (lower-case, unaccented)
CREATE OR REPLACE FUNCTION nutrition.sync_food_name_search()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name_search := lower(unaccent(COALESCE(NEW.name_vi, NEW.name)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_food_name_search ON nutrition.foods;
CREATE TRIGGER trg_sync_food_name_search
BEFORE INSERT OR UPDATE OF name, name_vi ON nutrition.foods
FOR EACH ROW
EXECUTE FUNCTION nutrition.sync_food_name_search();

-- 3. Create nutrition.food_portions table
CREATE TABLE IF NOT EXISTS nutrition.food_portions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id UUID NOT NULL REFERENCES nutrition.foods(id) ON DELETE CASCADE,
    label_vi TEXT NOT NULL,
    grams NUMERIC(8,2) NOT NULL CHECK (grams > 0),
    sort INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes for fast search, category filtering, and rich-in lookups
CREATE INDEX IF NOT EXISTS idx_foods_name_search_trgm ON nutrition.foods USING gin (name_search gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_foods_category ON nutrition.foods (category);
CREATE INDEX IF NOT EXISTS idx_foods_source_source_id ON nutrition.foods (source, source_id);
CREATE INDEX IF NOT EXISTS idx_food_portions_food_id ON nutrition.food_portions (food_id);

-- Expression indexes for rich-in nutrients
CREATE INDEX IF NOT EXISTS idx_foods_rich_calcium ON nutrition.foods (((per_100g->>'calcium')::numeric)) WHERE per_100g->>'calcium' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foods_rich_iron ON nutrition.foods (((per_100g->>'iron')::numeric)) WHERE per_100g->>'iron' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foods_rich_potassium ON nutrition.foods (((per_100g->>'potassium')::numeric)) WHERE per_100g->>'potassium' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foods_rich_magnesium ON nutrition.foods (((per_100g->>'magnesium')::numeric)) WHERE per_100g->>'magnesium' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foods_rich_zinc ON nutrition.foods (((per_100g->>'zinc')::numeric)) WHERE per_100g->>'zinc' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foods_rich_vitamin_d ON nutrition.foods (((per_100g->>'vitamin_d')::numeric)) WHERE per_100g->>'vitamin_d' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foods_rich_protein ON nutrition.foods (((per_100g->>'protein')::numeric)) WHERE per_100g->>'protein' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_foods_rich_fiber ON nutrition.foods (((per_100g->>'fiber')::numeric)) WHERE per_100g->>'fiber' IS NOT NULL;
