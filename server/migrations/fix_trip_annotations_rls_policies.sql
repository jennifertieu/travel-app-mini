-- Migration: Fix RLS policies for trip_annotations to allow creating annotations
-- This fixes the RLS policy violation when creating new annotations

-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Trip members can view annotations" ON trip_annotations;
DROP POLICY IF EXISTS "Trip members can create annotations" ON trip_annotations;
DROP POLICY IF EXISTS "Trip members can delete annotations" ON trip_annotations;

-- Create simplified policies that work with the current data structure

-- Policy: Users can view annotations for trips they own or collaborate on
CREATE POLICY "Users can view trip annotations" ON trip_annotations
  FOR SELECT USING (
    trip_id IN (
      -- Trips the user owns (using member_profiles mapping)
      SELECT t.id FROM trips t 
      JOIN member_profiles mp ON t.created_by = mp.id 
      WHERE mp.user_id = auth.uid()
      
      UNION
      
      -- Trips the user collaborates on
      SELECT tc.trip_id FROM trip_collaborators tc 
      WHERE tc.user_id = auth.uid()
    )
  );

-- Policy: Users can create annotations for trips they own or collaborate on
CREATE POLICY "Users can create trip annotations" ON trip_annotations
  FOR INSERT WITH CHECK (
    -- Check if user has access to the trip
    trip_id IN (
      -- Trips the user owns (using member_profiles mapping)
      SELECT t.id FROM trips t 
      JOIN member_profiles mp ON t.created_by = mp.id 
      WHERE mp.user_id = auth.uid()
      
      UNION
      
      -- Trips the user collaborates on
      SELECT tc.trip_id FROM trip_collaborators tc 
      WHERE tc.user_id = auth.uid()
    )
    AND 
    -- Check if created_by matches the user's member_profile id
    created_by IN (
      SELECT id FROM member_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete annotations they created or for trips they own
CREATE POLICY "Users can delete trip annotations" ON trip_annotations
  FOR DELETE USING (
    -- User created this annotation
    created_by IN (
      SELECT id FROM member_profiles WHERE user_id = auth.uid()
    )
    OR
    -- User owns the trip
    trip_id IN (
      SELECT t.id FROM trips t 
      JOIN member_profiles mp ON t.created_by = mp.id 
      WHERE mp.user_id = auth.uid()
    )
  );

-- Policy: Users can update annotations they created
CREATE POLICY "Users can update trip annotations" ON trip_annotations
  FOR UPDATE USING (
    created_by IN (
      SELECT id FROM member_profiles WHERE user_id = auth.uid()
    )
  );