-- 000005_library.down.sql

DROP POLICY IF EXISTS "Users can manage items of own saved meals" ON nutrition.saved_meal_items;
DROP POLICY IF EXISTS "Users can manage own saved meals" ON nutrition.saved_meals;
DROP POLICY IF EXISTS "Users can manage own recents" ON nutrition.user_recents;
DROP POLICY IF EXISTS "Users can manage own favourites" ON nutrition.user_favourites;

DROP TABLE IF EXISTS nutrition.saved_meal_items;
DROP TABLE IF EXISTS nutrition.saved_meals;
DROP TABLE IF EXISTS nutrition.user_recents;
DROP TABLE IF EXISTS nutrition.user_favourites;
