-- Migration: Add name field to trip_annotations table
-- This adds an optional display name for annotation areas (e.g., "Downtown Hotels", "Food District")

ALTER TABLE trip_annotations 
ADD COLUMN name TEXT;

COMMENT ON COLUMN trip_annotations.name IS 'Optional display name for the annotation area (e.g., "Downtown Hotels", "Food District")';
