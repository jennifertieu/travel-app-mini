-- Migration: Add trip_collaborators table for collaborative trips feature
-- Run this in your Supabase SQL editor

-- Create trip_collaborators table
CREATE TABLE IF NOT EXISTS trip_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  user_id UUID,
  invite_token TEXT UNIQUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_trip_collaborators_trip_id 
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_collaborators_user_id 
    FOREIGN KEY (user_id) REFERENCES member_profiles(user_id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate collaborators
  CONSTRAINT unique_trip_user UNIQUE (trip_id, user_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON trip_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_invite_token ON trip_collaborators(invite_token);

-- Enable Row Level Security
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read collaborators for trips they own or collaborate on
CREATE POLICY "Users can read trip collaborators" ON trip_collaborators
  FOR SELECT USING (
    user_id = auth.uid() OR 
    trip_id IN (
      SELECT id FROM trips WHERE created_by = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert collaborators for trips they own or collaborate on
CREATE POLICY "Users can add trip collaborators" ON trip_collaborators
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE created_by = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update collaborators for trips they own or their own records
CREATE POLICY "Users can update trip collaborators" ON trip_collaborators
  FOR UPDATE USING (
    user_id = auth.uid() OR
    trip_id IN (
      SELECT id FROM trips WHERE created_by = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Allow public read for invite token validation (before joining)
CREATE POLICY "Public can read invite details" ON trip_collaborators
  FOR SELECT USING (
    invite_token IS NOT NULL AND user_id IS NULL
  );

-- Add comments for documentation
COMMENT ON TABLE trip_collaborators IS 'Stores collaboration relationships between users and trips via invite links';
COMMENT ON COLUMN trip_collaborators.id IS 'Primary key for the collaboration record';
COMMENT ON COLUMN trip_collaborators.trip_id IS 'Foreign key to trips table';
COMMENT ON COLUMN trip_collaborators.user_id IS 'Foreign key to member_profiles table, null until user joins';
COMMENT ON COLUMN trip_collaborators.invite_token IS 'Unique token for invite links, used before user joins';
COMMENT ON COLUMN trip_collaborators.joined_at IS 'Timestamp when user joined the trip';
COMMENT ON COLUMN trip_collaborators.created_at IS 'Timestamp when invite was created';