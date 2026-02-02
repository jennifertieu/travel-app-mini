-- Migration: Fix RLS policies for trip_collaborators to allow joining trips
-- This fixes the issue where users can't join trips via invite links

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can add trip collaborators" ON trip_collaborators;

-- Create a new policy that allows any authenticated user to add themselves as a collaborator
-- This is needed for the hackathon mode where users join trips directly via trip ID
CREATE POLICY "Users can join any trip as collaborator" ON trip_collaborators
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );

-- Also add a policy for trip owners/collaborators to add others (for invite generation)
CREATE POLICY "Trip members can add collaborators" ON trip_collaborators
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE created_by = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
    )
  );