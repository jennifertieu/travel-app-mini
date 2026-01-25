import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify that a user has access to a specific trip
 * 
 * Checks two conditions:
 * 1. User is the trip creator (trips.created_by)
 * 2. User is a trip member (trip_members.member_id)
 * 
 * This function is used for authorization before allowing access to trip data.
 * Returns false on any error (trip not found, database error, etc.) for security.
 * 
 * @param tripId - UUID of the trip to check access for
 * @param userId - UUID of the user requesting access
 * @param supabase - Supabase client instance
 * 
 * @returns Promise resolving to boolean
 * @returns true - User has access (creator or member)
 * @returns false - User does not have access, trip not found, or error occurred
 * 
 * @example
 * ```typescript
 * const hasAccess = await verifyTripAccess(tripId, userId, supabase);
 * if (!hasAccess) {
 *   return response.status(403).json({ error: "Not authorized" });
 * }
 * ```
 */
export const verifyTripAccess = async (
  tripId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> => {
  try {
    // Check if user is trip creator
    const { data: trip, error } = await supabase
      .from("trips")
      .select("id, created_by")
      .eq("id", tripId)
      .single();

    if (error || !trip) {
      return false;
    }

    // User is creator
    if (trip.created_by === userId) {
      return true;
    }

    // Check if user is a trip member (group trips)
    const { data: membership } = await supabase
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("member_id", userId)
      .single();

    if (membership) {
      return true;
    }

    return false;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[verifyTripAccess] Error: ${errorMessage}`);
    return false;
  }
};
