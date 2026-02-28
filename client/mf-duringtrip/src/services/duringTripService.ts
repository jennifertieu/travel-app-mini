import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.PUBLIC_API_URL || import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:5001';

export interface SuggestionCardData {
  id: string;
  title: string;
  type: 'scheduled' | 'spontaneous' | 'rest';
  distance_km: number;
  time_required_minutes: number;
  energy_level: 'low' | 'medium' | 'high';
  reason: string;
  coordinates: { lat: number; lng: number };
}

export interface FoodCardData {
  id: string;
  name: string;
  type: 'restaurant' | 'cafe' | 'quick_bite' | 'park_rest';
  cuisine?: string;
  price_level: number;
  distance_km: number;
  walking_time_minutes: number;
  reason: string;
  coordinates: { lat: number; lng: number };
  dietary_match: boolean;
  rating?: number;
  photo_url?: string;
}

export interface ChatCard {
  type: 'suggestion' | 'food';
  data: SuggestionCardData | FoodCardData;
}

export interface ChatResponse {
  text: string;
  cards?: ChatCard[];
  context_summary?: string;
  location_approximate?: boolean;
}

export interface AcceptSuggestionResponse {
  success: boolean;
  activity: {
    id: string;
    name: string;
    time_of_day: string;
    duration_minutes: number;
  };
  conflicts_detected?: boolean;
  conflicts_resolved?: boolean;
  conflicts?: Array<{
    type: string;
    time_of_day: string;
    description: string;
    conflicting_activities: string[];
  }>;
  removed_activities?: Array<{ id: string; name: string }>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('Not authenticated');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function sendChatMessage(
  tripId: string,
  message: string,
  location?: { lat: number; lng: number; accuracy_meters?: number }
): Promise<ChatResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/during-trip/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      trip_id: tripId,
      message,
      location,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Chat request failed' }));
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}

export async function acceptSuggestion(
  tripId: string,
  suggestion: SuggestionCardData | FoodCardData,
  timeOfDay: 'morning' | 'afternoon' | 'evening',
  durationMinutes: number,
  overrideConflicts?: boolean
): Promise<AcceptSuggestionResponse> {
  const headers = await getAuthHeaders();

  const suggestionPayload = {
    id: suggestion.id,
    title: 'title' in suggestion ? suggestion.title : (suggestion as FoodCardData).name,
    type: suggestion.type,
    coordinates: suggestion.coordinates,
    distance_km: suggestion.distance_km,
    time_required_minutes: 'time_required_minutes' in suggestion
      ? (suggestion as SuggestionCardData).time_required_minutes
      : undefined,
    energy_level: 'energy_level' in suggestion
      ? (suggestion as SuggestionCardData).energy_level
      : undefined,
    reason: suggestion.reason,
    cuisine: 'cuisine' in suggestion ? (suggestion as FoodCardData).cuisine : undefined,
    price_level: 'price_level' in suggestion ? (suggestion as FoodCardData).price_level : undefined,
    rating: 'rating' in suggestion ? (suggestion as FoodCardData).rating : undefined,
    dietary_match: 'dietary_match' in suggestion ? (suggestion as FoodCardData).dietary_match : undefined,
  };

  const response = await fetch(`${API_BASE_URL}/during-trip/suggestions/accept`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      trip_id: tripId,
      suggestion: suggestionPayload,
      time_of_day: timeOfDay,
      duration_minutes: durationMinutes,
      override_conflicts: overrideConflicts,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Accept failed' }));
    if (response.status === 409) {
      return error as AcceptSuggestionResponse;
    }
    throw new Error(error.error || 'Failed to accept suggestion');
  }

  return response.json();
}

export async function updateActivityStatus(
  tripId: string,
  activityId: string,
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped',
  notes?: string
): Promise<{ success: boolean; activity: { id: string; status: string; updated_at: string } }> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/during-trip/activity/${activityId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      trip_id: tripId,
      status,
      notes,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Update failed' }));
    throw new Error(error.error || 'Failed to update activity status');
  }

  return response.json();
}

export interface DecisionResponse {
  options: SuggestionCardData[];
  context_summary: string;
  fallback_used?: boolean;
  location_approximate?: boolean;
}

export async function getDecision(
  tripId: string,
  location?: { lat: number; lng: number; accuracy_meters?: number } | null
): Promise<DecisionResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/during-trip/decide`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      trip_id: tripId,
      location: location ?? undefined,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Decision request failed' }));
    throw new Error(error.error || 'Failed to get suggestions');
  }

  return response.json();
}

export async function getTripContext(
  tripId: string,
  location?: { lat: number; lng: number; accuracy_meters?: number }
): Promise<{ context_summary: string } & Record<string, unknown>> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/during-trip/context`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      trip_id: tripId,
      location,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Context request failed' }));
    throw new Error(error.error || 'Failed to get trip context');
  }

  return response.json();
}
