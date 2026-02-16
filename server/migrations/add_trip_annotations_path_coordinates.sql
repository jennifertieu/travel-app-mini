-- Migration: Document path coordinates for trip annotations
-- Run this in your Supabase SQL editor

COMMENT ON COLUMN trip_annotations.coordinates IS
  'JSONB object with geographic bounds or shapes: box {north,south,east,west}, polygon {type:"polygon", points:[{lat,lng}]}, path {type:"path", points:[{lat,lng}]}';
