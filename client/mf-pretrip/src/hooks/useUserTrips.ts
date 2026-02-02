import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Database } from "@travel-app/shared-types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

/**
 * Hook to fetch all trips for the authenticated user
 *
 * @param userId - The authenticated user's ID
 * @returns Query result with trips data, loading state, and error handling
 */
export function useUserTrips(userId: string | null) {
  return useQuery({
    queryKey: ["user-trips", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - trips don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for reasonable time
  });
}
