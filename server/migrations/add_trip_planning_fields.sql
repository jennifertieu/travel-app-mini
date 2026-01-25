-- Migration: Add trip planning fields to trips table
-- Run this in your Supabase SQL editor

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS duration_days INTEGER,
ADD COLUMN IF NOT EXISTS budget_level TEXT CHECK (budget_level IN ('$', '$$', '$$$')),
ADD COLUMN IF NOT EXISTS interests TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN trips.duration_days IS 'Number of days planned for the trip';
COMMENT ON COLUMN trips.budget_level IS 'Budget tier: $ (budget), $$ (moderate), $$$ (luxury)';
COMMENT ON COLUMN trips.interests IS 'Array of interest tags selected during trip planning';
