import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify that a user has access to a specific trip
 * Returns true if user is the trip creator or a trip member
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

    // TODO: Check trip_members table when group trips are implemented
    // const { data: membership } = await supabase
    //   .from("trip_members")
    //   .select("id")
    //   .eq("trip_id", tripId)
    //   .eq("user_id", userId)
    //   .single();
    //
    // if (membership) return true;

    return false;
  } catch (error: any) {
    console.error(`[verifyTripAccess] Error: ${error.message}`);
    return false;
  }
};
