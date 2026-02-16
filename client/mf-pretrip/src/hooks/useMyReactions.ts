import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export type MyReactionMap = Record<
  string,
  { signal: string; comment: string | null; reactionId: string }
>;

/**
 * Batch-fetch the current user's reactions for all ideas in a trip.
 * Returns a map of ideaId -> { signal, comment, reactionId }.
 * Used by the rating modal to determine which ideas are unrated and to show existing votes.
 */
export function useMyReactions(
  memberId: string | null,
  ideaIds: string[]
): { data: MyReactionMap; isLoading: boolean } {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["myReactions", memberId, ideaIds.sort().join(",")],
    queryFn: async (): Promise<MyReactionMap> => {
      if (!memberId || ideaIds.length === 0) return {};

      const { data, error } = await supabase
        .from("trip_reel_idea_reactions")
        .select("id, idea_id, signal, comment")
        .eq("member_id", memberId)
        .in("idea_id", ideaIds);

      if (error) throw error;

      const map: MyReactionMap = {};
      for (const row of data || []) {
        map[row.idea_id] = {
          signal: row.signal,
          comment: row.comment,
          reactionId: row.id,
        };
      }
      return map;
    },
    enabled: !!memberId && ideaIds.length > 0,
  });

  // Realtime subscription: invalidate when any reaction changes for these ideas
  useEffect(() => {
    if (!memberId || ideaIds.length === 0) return;

    const channel = supabase
      .channel(`myReactions:${memberId}:${ideaIds.length}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_reel_idea_reactions",
          filter: `member_id=eq.${memberId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["myReactions", memberId, ideaIds.sort().join(",")],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId, ideaIds.join(","), queryClient]);

  return {
    data: query.data ?? {},
    isLoading: query.isLoading,
  };
}
