import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Database, TablesInsert, TablesUpdate } from "@/types";
import { queryKeys } from "../lib/queryKeys";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];
type IdeaInsert = TablesInsert<"trip_reel_ideas">;
type IdeaUpdate = TablesUpdate<"trip_reel_ideas">;

/**
 * Fetch all ideas for a trip with realtime subscription
 */
export function useIdeas(tripId: string | null) {
  const queryClient = useQueryClient();

  console.log(`🎯 useIdeas: Hook called with tripId: ${tripId}`);

  const query = useQuery({
    queryKey: queryKeys.ideas(tripId || ""),
    queryFn: async () => {
      if (!tripId) return [];

      console.log(`🔍 useIdeas: Fetching ideas for trip ${tripId}`);

      const { data, error } = await supabase
        .from("trip_reel_ideas")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log(`✅ useIdeas: Found ${data.length} ideas for trip ${tripId}`);
      return data;
    },
    enabled: !!tripId,
  });

  // Setup realtime subscription — directly update the cache for instant UI
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`ideas:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_reel_ideas",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log("💡 [Realtime] Idea INSERT:", payload.new);
          const newIdea = payload.new as Idea;
          queryClient.setQueryData<Idea[]>(
            queryKeys.ideas(tripId),
            (old = []) => {
              // Avoid duplicates (e.g. if we also did a mutation locally)
              if (old.some((i) => i.id === newIdea.id)) return old;
              return [newIdea, ...old];
            },
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trip_reel_ideas",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log("💡 [Realtime] Idea UPDATE:", payload.new);
          const updated = payload.new as Idea;
          queryClient.setQueryData<Idea[]>(
            queryKeys.ideas(tripId),
            (old = []) => old.map((i) => (i.id === updated.id ? updated : i)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "trip_reel_ideas",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log("💡 [Realtime] Idea DELETE:", payload.old);
          const deletedId = (payload.old as { id: string }).id;
          queryClient.setQueryData<Idea[]>(
            queryKeys.ideas(tripId),
            (old = []) => old.filter((i) => i.id !== deletedId),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  return query;
}

/**
 * Add a new idea
 */
export function useAddIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idea: IdeaInsert) => {
      const { data, error } = await supabase
        .from("trip_reel_ideas")
        .insert(idea)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.ideas(data.trip_id),
      });
    },
  });
}

/**
 * Update an idea (for enrichment data)
 */
export function useUpdateIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: IdeaUpdate & { id: string }) => {
      const { id, ...updateData } = updates;
      const { data, error } = await supabase
        .from("trip_reel_ideas")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.ideas(data.trip_id),
      });
    },
  });
}

/**
 * Delete an idea
 */
export function useDeleteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ideaId,
      tripId,
    }: {
      ideaId: string;
      tripId: string;
    }) => {
      const { error } = await supabase
        .from("trip_reel_ideas")
        .delete()
        .eq("id", ideaId);

      if (error) throw error;
      return { ideaId, tripId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas(data.tripId) });
    },
  });
}
