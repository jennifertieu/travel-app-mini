-- Migration: Add trip_annotations table for realtime map collaboration
-- Run this in your Supabase SQL editor

-- Create trip_annotations table
CREATE TABLE IF NOT EXISTS trip_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  created_by UUID NOT NULL,
  coordinates JSONB NOT NULL,
  label TEXT,
  intent TEXT CHECK (intent IN ('annotation', 'search_area')),
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_trip_annotations_trip_id 
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_annotations_created_by 
    FOREIGN KEY (created_by) REFERENCES member_profiles(id) ON DELETE CASCADE
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_trip_annotations_trip_id ON trip_annotations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_annotations_created_by ON trip_annotations(created_by);

-- Enable Row Level Security
ALTER TABLE trip_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Trip members (creator + collaborators) can view annotations
CREATE POLICY "Trip members can view annotations" ON trip_annotations
  FOR SELECT USING (
    trip_id IN (
      -- Trip creator (member_profiles.id mapped from auth.uid)
      SELECT id FROM trips WHERE created_by IN (
        SELECT id FROM member_profiles WHERE user_id = auth.uid()
      )
      UNION
      -- Trip collaborators (auth.users id)
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Trip members can create annotations
CREATE POLICY "Trip members can create annotations" ON trip_annotations
  FOR INSERT WITH CHECK (
    trip_id IN (
      -- Trip creator (member_profiles.id mapped from auth.uid)
      SELECT id FROM trips WHERE created_by IN (
        SELECT id FROM member_profiles WHERE user_id = auth.uid()
      )
      UNION
      -- Trip collaborators (auth.users id)
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
    )
    AND created_by IN (
      SELECT id FROM member_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Trip members can delete annotations
CREATE POLICY "Trip members can delete annotations" ON trip_annotations
  FOR DELETE USING (
    trip_id IN (
      -- Trip creator (member_profiles.id mapped from auth.uid)
      SELECT id FROM trips WHERE created_by IN (
        SELECT id FROM member_profiles WHERE user_id = auth.uid()
      )
      UNION
      -- Trip collaborators (auth.users id)
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
    )
  );

-- Enable Realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE trip_annotations;

-- Add comments for documentation
COMMENT ON TABLE trip_annotations IS 'Stores spatial annotations (boxes, notes, search areas) drawn on trip maps for real-time collaboration';
COMMENT ON COLUMN trip_annotations.id IS 'Primary key for the annotation';
COMMENT ON COLUMN trip_annotations.trip_id IS 'Foreign key to trips table';
COMMENT ON COLUMN trip_annotations.created_by IS 'Foreign key to member_profiles table - user who created the annotation';
COMMENT ON COLUMN trip_annotations.coordinates IS 'JSONB object with geographic bounds: {north, south, east, west}';
COMMENT ON COLUMN trip_annotations.label IS 'Optional text label/note for the annotation';
COMMENT ON COLUMN trip_annotations.intent IS 'Purpose of annotation: "annotation" for notes, "search_area" for AI search boxes';
COMMENT ON COLUMN trip_annotations.color IS 'Hex color code for the annotation border (default: #3B82F6)';
COMMENT ON COLUMN trip_annotations.created_at IS 'Timestamp when annotation was created';
