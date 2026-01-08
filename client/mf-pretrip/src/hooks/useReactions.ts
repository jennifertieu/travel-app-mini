import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database, TablesInsert } from '@travel-app/shared-types';

type Reaction = Database['public']['Tables']['trip_reel_idea_reactions']['Row'];
type ReactionInsert = TablesInsert<'trip_reel_idea_reactions'>;

/**
 * Fetch all reactions for an idea with realtime subscription
 */
export function useReactions(ideaId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reactions', ideaId],
    queryFn: async () => {
      if (!ideaId) return [];

      const { data, error } = await supabase
        .from('trip_reel_idea_reactions')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!ideaId,
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!ideaId) return;

    const channel = supabase
      .channel(`reactions:${ideaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_reel_idea_reactions',
          filter: `idea_id=eq.${ideaId}`,
        },
        (payload) => {
          console.log('👍 [Realtime] Reactions change:', payload);
          queryClient.invalidateQueries({ queryKey: ['reactions', ideaId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ideaId, queryClient]);

  return query;
}

/**
 * Set a reaction (upsert - replaces existing from same member)
 */
export function useSetReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reaction: ReactionInsert) => {
      // First check if user already has a reaction for this idea
      const { data: existing } = await supabase
        .from('trip_reel_idea_reactions')
        .select('id')
        .eq('idea_id', reaction.idea_id)
        .eq('member_id', reaction.member_id)
        .maybeSingle();

      if (existing) {
        // Update existing reaction
        const { data, error } = await supabase
          .from('trip_reel_idea_reactions')
          .update({
            signal: reaction.signal,
            comment: reaction.comment,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new reaction
        const { data, error } = await supabase
          .from('trip_reel_idea_reactions')
          .insert(reaction)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reactions', data.idea_id] });
    },
  });
}

/**
 * Delete a reaction
 */
export function useDeleteReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reactionId, ideaId }: { reactionId: string; ideaId: string }) => {
      const { error } = await supabase
        .from('trip_reel_idea_reactions')
        .delete()
        .eq('id', reactionId);

      if (error) throw error;
      return { reactionId, ideaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reactions', data.ideaId] });
    },
  });
}

