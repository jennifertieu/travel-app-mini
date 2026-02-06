import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Database } from "@travel-app/shared-types";
import { queryKeys } from "../lib/queryKeys";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

export interface CollaborativeTrip extends Trip {
  is_owner: boolean;
  is_collaborator: boolean;
  member_count: number;
}

export function useUserTrips(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.userTrips(userId || ""),
    queryFn: async () => {
      if (!userId) return [];

      const { data: ownedTrips, error: ownedError } = await supabase
        .from("trips")
        .select(
          `
          *,
          trip_collaborators!left(user_id)
        `,
        )
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

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
          .order("created_at", { ascending: false });

      if (collaborativeError) throw collaborativeError;

      const allTrips = [...(ownedTrips || []), ...(collaborativeTrips || [])];
      const uniqueTrips = allTrips.filter(
        (trip, index, self) =>
          index === self.findIndex((t) => t.id === trip.id),
      );

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

      return collaborativeTripsData;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
