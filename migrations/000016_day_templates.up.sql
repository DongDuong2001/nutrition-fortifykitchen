-- 000016_day_templates.up.sql
-- Ngày ăn mẫu: a whole day of meals saved by the user and copied back into an empty day. The id is made by the client,
-- so a save sent again offline is the same row. Soft delete, like the other user data. At most 50 live rows per user
-- (checked by the API). meals: [{"slot":"breakfast","items":[{"foodId":"…","servingLabel":"1 tô","grams":500}]}]
CREATE TABLE IF NOT EXISTS nutrition.day_templates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  tag TEXT NOT NULL CHECK (tag IN ('tap', 'nghi', 'khac')),
  meals JSONB NOT NULL CHECK (jsonb_typeof(meals) = 'array' AND jsonb_array_length(meals) BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- The live templates of a user, newest first (GET /day-templates)
CREATE INDEX IF NOT EXISTS idx_day_templates_user_live
  ON nutrition.day_templates (user_id, created_at DESC) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_day_templates_touch_updated_at ON nutrition.day_templates;
CREATE TRIGGER trg_day_templates_touch_updated_at
BEFORE UPDATE ON nutrition.day_templates
FOR EACH ROW
EXECUTE FUNCTION nutrition.touch_updated_at();

ALTER TABLE nutrition.day_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage own day templates" ON nutrition.day_templates
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
