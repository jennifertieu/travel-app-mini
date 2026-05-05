import { useQuery } from "@tanstack/react-query";
import { getTripMembers, TripMember } from "@/lib/collaboration";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to fetch all members of a trip (collaborators + creator)
 *
 * @param tripId - The ID of the trip to fetch members for
 * @returns Query result with trip members data, loading state, and error handling
 */
export function useTripMembers(tripId: string | null) {
  return useQuery({
    queryKey: queryKeys.members(tripId || ""),
    queryFn: async () => {
      if (!tripId) return [];
      return await getTripMembers(tripId);
    },
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000, // 5 minutes - member lists don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for reasonable time
    retry: (failureCount, error) => {
      // Don't retry on permission errors (403/401)
      if (
        error instanceof Error &&
        error.message.includes("Permission denied")
      ) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
}

export type { TripMember };
