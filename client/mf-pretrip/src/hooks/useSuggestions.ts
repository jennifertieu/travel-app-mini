import { useMutation, useQueryClient } from '@tanstack/react-query';

interface TripSuggestionInput {
  tripId: string;
  destination: string;
  durationDays: number | null;
  budgetLevel: string | null;
  interests: string[] | null;
  createdBy: string;
}

interface GenerateSuggestionsResponse {
  success: boolean;
  suggestionIds: string[];
  total: number;
  saved: number;
  failed: number;
  errors?: any[];
  message?: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

export function useGenerateSuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tripData: TripSuggestionInput): Promise<GenerateSuggestionsResponse> => {
      console.log('🚀 [useSuggestions] Generating suggestions for trip:', tripData.tripId);
      
      const response = await fetch(`${BACKEND_URL}/suggestions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tripData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate suggestions' }));
        throw new Error(error.error || 'Failed to generate suggestions');
      }

      const data = await response.json();
      console.log('✅ [useSuggestions] Suggestions generated:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate ideas query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['ideas', variables.tripId] });
      console.log('🔄 [useSuggestions] Invalidated ideas query for refetch');
    },
    onError: (error) => {
      console.error('❌ [useSuggestions] Error generating suggestions:', error);
    },
  });
}
