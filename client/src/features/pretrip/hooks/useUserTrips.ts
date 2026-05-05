import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Database } from "@/types";
import { queryKeys } from "../lib/queryKeys";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

// Extended trip type with collaboration info
export interface CollaborativeTrip extends Trip {
  is_owner: boolean;
  is_collaborator: boolean;
  member_count: number;
}

/**
 * Hook to fetch all trips for the authenticated user (owned and collaborative)
 *
 * @param userId - The authenticated user's ID
 * @returns Query result with trips data including collaboration info, loading state, and error handling
 */
export function useUserTrips(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.userTrips(userId || ""),
    queryFn: async () => {
      if (!userId) return [];

      console.log(`🔍 Fetching trips for user ${userId}`);

      // Get trips where user is owner or collaborator
      // First get trips where user is the owner
      const { data: ownedTrips, error: ownedError } = await supabase
        .from("trips")
        .select(
          `
          *,
          trip_collaborators!left(user_id)
        `,
        )
        .eq("created_by", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

      // Then get trips where user is a collaborator
      const { data: collaborativeTrips, error: collaborativeError } =
        await supabase
          .from("trips")
          .select(
            `
          *,
          trip_collaborators!left(user_id)
        `,
          )
          .neq("created_by", userId)
          .eq("trip_collaborators.user_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

      if (collaborativeError) throw collaborativeError;

      // Combine and deduplicate trips
      const allTrips = [...(ownedTrips || []), ...(collaborativeTrips || [])];
      const uniqueTrips = allTrips.filter(
        (trip, index, self) =>
          index === self.findIndex((t) => t.id === trip.id),
      );

      // Transform data to include collaboration info
      const collaborativeTripsData: CollaborativeTrip[] = uniqueTrips.map(
        (trip) => {
          const isOwner = trip.created_by === userId;
          const collaborators = trip.trip_collaborators || [];
          const isCollaborator = collaborators.some(
            (c: any) => c.user_id === userId && !isOwner,
          );
          const memberCount = collaborators.filter(
            (c: any) => c.user_id !== null,
          ).length;

          return {
            ...trip,
            is_owner: isOwner,
            is_collaborator: isCollaborator,
            member_count: memberCount,
          };
        },
      );

      console.log(
        `✅ Found ${collaborativeTripsData.length} trips for user ${userId}`,
      );
      return collaborativeTripsData;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - trips don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for reasonable time
  });
}
