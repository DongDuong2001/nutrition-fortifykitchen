-- 000004_diary_core.up.sql

-- 1. Alter nutrition.diary_logs to support kind, nullable food_id, portion details, name snapshot, client_id, and soft deletes
ALTER TABLE nutrition.diary_logs
    ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'food',
    ADD COLUMN IF NOT EXISTS portion_label TEXT,
    ADD COLUMN IF NOT EXISTS grams NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS calories NUMERIC(8,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS name_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS client_id UUID UNIQUE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Allow food_id to be NULL for quick energy entries
ALTER TABLE nutrition.diary_logs ALTER COLUMN food_id DROP NOT NULL;

-- Invariant constraints on kind and food_id
ALTER TABLE nutrition.diary_logs
    ADD CONSTRAINT chk_diary_logs_kind CHECK (kind IN ('food', 'quick')),
    ADD CONSTRAINT chk_diary_logs_food_id CHECK ((kind = 'food' AND food_id IS NOT NULL) OR (kind = 'quick' AND food_id IS NULL));

-- Index for non-deleted diary logs by user and date
CREATE INDEX IF NOT EXISTS idx_diary_logs_active_user_date ON nutrition.diary_logs (user_id, log_date) WHERE deleted_at IS NULL;

-- 2. Create nutrition.day_training table
CREATE TABLE IF NOT EXISTS nutrition.day_training (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    minutes INT NOT NULL CHECK (minutes IN (0, 45, 60, 90, 120, 240)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, log_date)
);

-- RLS policy for day_training
ALTER TABLE nutrition.day_training ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can manage own day training" ON nutrition.day_training
        FOR ALL USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
