import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database, TablesInsert, TablesUpdate } from '@travel-app/shared-types';

type Comment = Database['public']['Tables']['trip_reel_idea_comments']['Row'];
type CommentInsert = TablesInsert<'trip_reel_idea_comments'>;
type CommentUpdate = TablesUpdate<'trip_reel_idea_comments'>;

/**
 * Fetch all comments for an idea with realtime subscription
 */
export function useComments(ideaId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['comments', ideaId],
    queryFn: async () => {
      if (!ideaId) return [];

      const { data, error } = await supabase
        .from('trip_reel_idea_comments')
        .select('*')
        .eq('idea_id', ideaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!ideaId,
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!ideaId) return;

    const channel = supabase
      .channel(`comments:${ideaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_reel_idea_comments',
          filter: `idea_id=eq.${ideaId}`,
        },
        (payload) => {
          console.log('💬 [Realtime] Comments change:', payload);
          queryClient.invalidateQueries({ queryKey: ['comments', ideaId] });
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
 * Add a new comment
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: CommentInsert) => {
      const { data, error } = await supabase
        .from('trip_reel_idea_comments')
        .insert(comment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.idea_id] });
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateComment(commentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: CommentUpdate) => {
      const { data, error } = await supabase
        .from('trip_reel_idea_comments')
        .update(updates)
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.idea_id] });
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, ideaId }: { commentId: string; ideaId: string }) => {
      const { error } = await supabase
        .from('trip_reel_idea_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      return { commentId, ideaId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.ideaId] });
    },
  });
}

