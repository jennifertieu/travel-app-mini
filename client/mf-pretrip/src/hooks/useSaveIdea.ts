import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { AllReactionsMap } from "./useAllTripReactions";

const SAVE_SIGNAL = "save";

/**
 * Derives the set of idea IDs that the current member has saved,
 * and provides a toggle function to save/unsave an idea.
 *
 * Piggybacks on the existing trip_reel_idea_reactions table
 * using signal = "save", so no DB migration is needed and
 * the realtime subscription in useAllTripReactions picks up changes.
 */
export function useSaveIdea(
  allReactions: AllReactionsMap,
  memberId: string | null,
  memberName: string | null,
  tripId: string | null,
  ideaIds: string[],
) {
  const queryClient = useQueryClient();

  const savedIdeaIds = new Set<string>();
  if (memberId) {
    for (const [ideaId, reactions] of Object.entries(allReactions)) {
      if (
        reactions.some(
          (r) => r.signal === SAVE_SIGNAL && r.member_id === memberId,
        )
      ) {
        savedIdeaIds.add(ideaId);
      }
    }
  }

  const sortedKey = [...ideaIds].sort().join(",");

  const toggleSave = useCallback(
    async (ideaId: string) => {
      if (!memberId || !tripId) return;

      const reactions = allReactions[ideaId] ?? [];
      const existing = reactions.find(
        (r) => r.signal === SAVE_SIGNAL && r.member_id === memberId,
      );

      if (existing) {
        await supabase
          .from("trip_reel_idea_reactions")
          .delete()
          .eq("id", existing.id);
      } else {
        await supabase.from("trip_reel_idea_reactions").insert({
          idea_id: ideaId,
          member_id: memberId,
          member_name: memberName,
          signal: SAVE_SIGNAL,
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["allTripReactions", tripId, sortedKey],
      });
    },
    [memberId, memberName, tripId, allReactions, queryClient, sortedKey],
  );

  return { savedIdeaIds, toggleSave };
}
