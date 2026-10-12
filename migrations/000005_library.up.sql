-- 000005_library.up.sql

-- 1. Create nutrition.user_favourites
CREATE TABLE IF NOT EXISTS nutrition.user_favourites (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES nutrition.foods(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favourites_user_id ON nutrition.user_favourites (user_id);

-- 2. Create nutrition.user_recents
CREATE TABLE IF NOT EXISTS nutrition.user_recents (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES nutrition.foods(id) ON DELETE CASCADE,
    last_portion_label TEXT,
    last_grams NUMERIC(8,2) NOT NULL DEFAULT 100,
    used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_user_recents_user_used ON nutrition.user_recents (user_id, used_at DESC);

-- 3. Create nutrition.saved_meals and saved_meal_items
CREATE TABLE IF NOT EXISTS nutrition.saved_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_meals_user ON nutrition.saved_meals (user_id);

CREATE TABLE IF NOT EXISTS nutrition.saved_meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_meal_id UUID NOT NULL REFERENCES nutrition.saved_meals(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES nutrition.foods(id) ON DELETE CASCADE,
    portion_label TEXT,
    grams NUMERIC(8,2) NOT NULL DEFAULT 100,
    sort INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_saved_meal_items_meal ON nutrition.saved_meal_items (saved_meal_id, sort ASC);

-- RLS policies
ALTER TABLE nutrition.user_favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.user_recents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.saved_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition.saved_meal_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can manage own favourites" ON nutrition.user_favourites
        FOR ALL USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can manage own recents" ON nutrition.user_recents
        FOR ALL USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can manage own saved meals" ON nutrition.saved_meals
        FOR ALL USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can manage items of own saved meals" ON nutrition.saved_meal_items
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM nutrition.saved_meals sm
                WHERE sm.id = saved_meal_id AND sm.user_id = auth.uid()
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
