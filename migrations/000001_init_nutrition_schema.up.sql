-- 000001_init_nutrition_schema.up.sql
-- Database Migration: Nutrition Platform Core Schema (PostgreSQL 17)

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create nutrition schema
CREATE SCHEMA IF NOT EXISTS nutrition;

-- 2. Create nutrition.foods
-- Holds standard and custom food items with exact 26 nutrient definitions per 100g.
CREATE TABLE IF NOT EXISTS nutrition.foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    serving_size_g NUMERIC(8,2) NOT NULL DEFAULT 100,
    per_100g_nutrients JSONB NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for food searches
CREATE INDEX IF NOT EXISTS idx_foods_name ON nutrition.foods (name);
CREATE INDEX IF NOT EXISTS idx_foods_created_by ON nutrition.foods (created_by) WHERE created_by IS NOT NULL;

-- 3. Create nutrition.diary_logs
-- Idempotent diary logging with client-generated UUID primary key.
CREATE TABLE IF NOT EXISTS nutrition.diary_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    food_id UUID NOT NULL REFERENCES nutrition.foods(id) ON DELETE RESTRICT,
    meal_slot TEXT NOT NULL,
    quantity NUMERIC(8,2) NOT NULL,
    serving_size_g NUMERIC(8,2) NOT NULL,
    nutrients_snapshot JSONB NOT NULL,
    log_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup for daily logs by user and date
CREATE INDEX IF NOT EXISTS idx_diary_logs_user_date ON nutrition.diary_logs (user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_diary_logs_food_id ON nutrition.diary_logs (food_id);

-- 4. Create nutrition.user_targets
-- Per-user daily nutritional goal targets
CREATE TABLE IF NOT EXISTS nutrition.user_targets (
    user_id UUID NOT NULL,
    target_date DATE NOT NULL,
    target_nutrients JSONB NOT NULL,
    PRIMARY KEY (user_id, target_date)
);

CREATE INDEX IF NOT EXISTS idx_user_targets_user ON nutrition.user_targets (user_id);

-- 5. Create nutrition.coach_drafts
-- Ingestion of coach markdown notes and meal plans from GitHub Vault
CREATE TABLE IF NOT EXISTS nutrition.coach_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL,
    markdown_content TEXT NOT NULL,
    parsed_data JSONB,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'rejected')),
    commit_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_drafts_status ON nutrition.coach_drafts (status);
CREATE INDEX IF NOT EXISTS idx_coach_drafts_file_path ON nutrition.coach_drafts (file_path);
