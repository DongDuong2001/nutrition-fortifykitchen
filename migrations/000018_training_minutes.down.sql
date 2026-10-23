-- Back to the presets only. A custom value saved since (150, 210, …) becomes the nearest preset first, or the old check would fail.
UPDATE nutrition.profiles SET training_minutes_default = CASE
    WHEN training_minutes_default <= 30 THEN 0 WHEN training_minutes_default < 75 THEN 60 WHEN training_minutes_default < 105 THEN 90
    WHEN training_minutes_default < 180 THEN 120 ELSE 240 END
  WHERE training_minutes_default NOT IN (0, 45, 60, 90, 120, 240);
UPDATE nutrition.day_training SET minutes = CASE
    WHEN minutes <= 30 THEN 0 WHEN minutes < 75 THEN 60 WHEN minutes < 105 THEN 90 WHEN minutes < 180 THEN 120 ELSE 240 END
  WHERE minutes NOT IN (0, 45, 60, 90, 120, 240);

ALTER TABLE nutrition.profiles DROP CONSTRAINT IF EXISTS profiles_training_minutes_default_check;
ALTER TABLE nutrition.profiles ADD CONSTRAINT profiles_training_minutes_default_check
  CHECK (training_minutes_default IN (0, 45, 60, 90, 120, 240));

ALTER TABLE nutrition.day_training DROP CONSTRAINT IF EXISTS day_training_minutes_check;
ALTER TABLE nutrition.day_training ADD CONSTRAINT day_training_minutes_check CHECK (minutes IN (0, 45, 60, 90, 120, 240));
