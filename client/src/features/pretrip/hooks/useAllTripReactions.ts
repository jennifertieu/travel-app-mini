import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Database } from "@/types";

type Reaction = Database["public"]["Tables"]["trip_reel_idea_reactions"]["Row"];

export type AllReactionsMap = Record<string, Reaction[]>;

const EMPTY_MAP: AllReactionsMap = {};

/**
 * Batch-fetch all reactions (from every member) for all ideas in a trip.
 * Returns a map of ideaId -> Reaction[].
 * Subscribes to realtime changes so collaborator votes appear live.
 */
export function useAllTripReactions(
  tripId: string | null,
  ideaIds: string[]
): { data: AllReactionsMap; isLoading: boolean } {
  const queryClient = useQueryClient();
  const sortedKey = [...ideaIds].sort().join(",");

  const query = useQuery({
    queryKey: ["allTripReactions", tripId, sortedKey],
    queryFn: async (): Promise<AllReactionsMap> => {
      if (!tripId || ideaIds.length === 0) return {};

      const { data, error } = await supabase
        .from("trip_reel_idea_reactions")
        .select("*")
        .in("idea_id", ideaIds);

      if (error) throw error;

      const map: AllReactionsMap = {};
      for (const row of data || []) {
        if (!map[row.idea_id]) map[row.idea_id] = [];
        map[row.idea_id].push(row);
      }
      return map;
    },
    enabled: !!tripId && ideaIds.length > 0,
  });

  useEffect(() => {
    if (!tripId || ideaIds.length === 0) return;

    const channel = supabase
      .channel(`allTripReactions:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_reel_idea_reactions",
        },
        (payload) => {
          const ideaId =
            (payload.new as any)?.idea_id || (payload.old as any)?.idea_id;
          if (ideaId && ideaIds.includes(ideaId)) {
            queryClient.invalidateQueries({
              queryKey: ["allTripReactions", tripId, sortedKey],
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, sortedKey, queryClient]);

  return {
    data: query.data ?? EMPTY_MAP,
    isLoading: query.isLoading,
  };
}
