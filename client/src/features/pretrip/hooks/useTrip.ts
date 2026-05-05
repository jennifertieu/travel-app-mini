import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Database, TablesInsert, TablesUpdate } from "@/types";
import { queryKeys } from "../lib/queryKeys";

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type TripInsert = TablesInsert<"trips">;
type TripUpdate = TablesUpdate<"trips">;

/**
 * Fetch a single trip by ID
 */
export function useTrip(tripId: string | null) {
  return useQuery({
    queryKey: queryKeys.trip(tripId || ""),
    queryFn: async () => {
      if (!tripId) return null;

      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });
}

/**
 * Create a new trip
 */
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trip: TripInsert) => {
      const { data, error } = await supabase
        .from("trips")
        .insert(trip)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trip(data.id) });
    },
  });
}

/**
 * Update an existing trip
 */
export function useUpdateTrip(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: TripUpdate) => {
      const { data, error } = await supabase
        .from("trips")
        .update(updates)
        .eq("id", tripId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) });
    },
  });
}

/**
 * Soft delete an existing trip (sets deleted_at timestamp)
 */
export function useDeleteTrip(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("trips")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", tripId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) });
    },
  });
}
