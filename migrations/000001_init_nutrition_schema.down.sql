-- 000001_init_nutrition_schema.down.sql
-- Database Migration Rollback: Nutrition Platform Core Schema

DROP TABLE IF EXISTS nutrition.coach_drafts CASCADE;
DROP TABLE IF EXISTS nutrition.user_targets CASCADE;
DROP TABLE IF EXISTS nutrition.diary_logs CASCADE;
DROP TABLE IF EXISTS nutrition.foods CASCADE;

DROP SCHEMA IF EXISTS nutrition CASCADE;
