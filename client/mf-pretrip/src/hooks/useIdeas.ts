import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database, TablesInsert, TablesUpdate } from '@travel-app/shared-types';

type Idea = Database['public']['Tables']['trip_reel_ideas']['Row'];
type IdeaInsert = TablesInsert<'trip_reel_ideas'>;
type IdeaUpdate = TablesUpdate<'trip_reel_ideas'>;

/**
 * Fetch all ideas for a trip with realtime subscription
 */
export function useIdeas(tripId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ideas', tripId],
    queryFn: async () => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from('trip_reel_ideas')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tripId,
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`ideas:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_reel_ideas',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('💡 [Realtime] Ideas change:', payload);
          queryClient.invalidateQueries({ queryKey: ['ideas', tripId] });
        }
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
        .from('trip_reel_ideas')
        .insert(idea)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideas', data.trip_id] });
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
        .from('trip_reel_ideas')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideas', data.trip_id] });
    },
  });
}

/**
 * Delete an idea
 */
export function useDeleteIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ideaId, tripId }: { ideaId: string; tripId: string }) => {
      const { error } = await supabase
        .from('trip_reel_ideas')
        .delete()
        .eq('id', ideaId);

      if (error) throw error;
      return { ideaId, tripId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideas', data.tripId] });
    },
  });
}

