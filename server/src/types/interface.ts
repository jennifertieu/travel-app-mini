import { SupabaseClient } from "@supabase/supabase-js";

// New types for aggregated reactions and trip ideas (no preference field)
// Aggregated reaction counts for an idea
export interface IIdeaReactionCounts {
  idea_id: string;
  fire: number;
  down: number;
  meh: number;
  skip: number;
}

// ============================================
// During-Trip Agent Types
// ============================================

// Scheduled activity for during-trip context
export interface IScheduledActivity {
  id: string;
  title: string;
  scheduled_time: string; // ISO string
  time_of_day: "morning" | "afternoon" | "evening";
  location?: { lat: number; lng: number };
  duration_minutes?: number;
}

// User location with accuracy info
export interface IUserLocation {
  lat: number;
  lng: number;
  accuracy_meters?: number; // Browser geolocation accuracy
  is_approximate: boolean; // True if using trip destination fallback
}

// User preferences for during-trip context
export interface IUserPreferences {
  travel_style: "chill" | "balanced" | "packed";
  dietary: string[];
  interests: string[];
  walking_tolerance: string; // "low" | "moderate" | "high"
}

// Trip context for during-trip agents
export interface ITripContext {
  user: {
    id: string;
    location: IUserLocation;
    preferences: IUserPreferences;
  };
  trip: {
    id: string;
    destination: string;
    destination_lat: number;
    destination_lng: number;
    day_number: number;
    total_days: number;
    timezone: string; // e.g., "Europe/Paris"
  };
  temporal: {
    current_time: string; // ISO string in trip timezone
    time_of_day: "morning" | "afternoon" | "evening";
    local_timezone: string;
  };
  environment: {
    weather: {
      condition: string;
      temperature: number;
      precipitation: boolean;
    } | null; // null if weather API fails
  };
  schedule: {
    next_activity?: IScheduledActivity;
    time_until_next?: number; // minutes
    current_activity?: IScheduledActivity;
    today_activities: IScheduledActivity[];
  };
}

// Decision Agent types
export interface IDecisionOption {
  id: string;
  title: string; // "Visit Sacré-Cœur"
  type: "scheduled" | "spontaneous" | "rest";
  distance_km: number;
  time_required_minutes: number;
  energy_level: "low" | "medium" | "high";
  reason: string; // "On your itinerary, 15 min walk"
  coordinates: { lat: number; lng: number };
}

export interface IDecisionResponse {
  options: IDecisionOption[]; // 3-5 options
  context_summary: string; // "Good morning! You have 2 hours before lunch"
  fallback_used?: boolean; // True if AI timed out and rule-based fallback was used
  location_approximate?: boolean; // True if using trip destination
}

// Food Recommendations types
export interface IFoodRecommendation {
  id: string;
  name: string;
  type: "restaurant" | "cafe" | "quick_bite" | "park_rest";
  cuisine?: string;
  price_level: number; // 1-4
  distance_km: number;
  walking_time_minutes: number;
  reason: string; // "It's lunchtime and this matches your vegetarian preference"
  coordinates: { lat: number; lng: number };
  dietary_match: boolean; // Matches user's dietary restrictions
  rating?: number; // Google rating
  photo_url?: string; // Google Places photo
}

export interface IFoodResponse {
  recommendations: IFoodRecommendation[];
  suggestion_reason: string; // "It's 12:30pm - time for lunch!"
}

// Google Places API response type (raw response from nearbysearch endpoint)
export interface IGooglePlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  photos?: Array<{
    photo_reference: string;
  }>;
}

// Map Intelligence types
export interface IMapAnnotation {
  location: { lat: number; lng: number };
  type: "scheduled" | "recommended" | "food";
  title: string;
  icon: string; // Icon name for frontend
  priority: number; // 1-3 (affects pin size)
  snippet?: string; // Shows on tap
  activity_id?: string; // If type=scheduled, links to itinerary activity
}

export interface IMapIntelligenceResponse {
  annotations: IMapAnnotation[];
  center: { lat: number; lng: number }; // Suggested map center
  zoom_level: number; // Suggested zoom
}

// During-Trip API Request/Response types
export interface ILocationRequest {
  lat: number;
  lng: number;
  accuracy_meters: number; // From browser Geolocation API
}

export interface IDuringTripRequest {
  trip_id: string;
  location?: ILocationRequest;
}

export interface IContextRequest extends IDuringTripRequest {}

export interface IDecideRequest extends IDuringTripRequest {}

export interface IFoodRequest extends IDuringTripRequest {}

export interface IMapIntelligenceRequest extends IDuringTripRequest {
  viewport?: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  };
}

export interface IActivityStatusRequest {
  trip_id: string;
  status: "scheduled" | "in_progress" | "completed" | "skipped";
  location?: { lat: number; lng: number };
  notes?: string;
}

// Standardized suggestion structure for accepting suggestions
export interface IAcceptSuggestionRequest {
  trip_id: string;
  suggestion: {
    id: string;
    title: string;
    type: "scheduled" | "spontaneous" | "rest" | "restaurant" | "cafe" | "quick_bite" | "park_rest";
    coordinates: { lat: number; lng: number };
    // Optional fields that may be present
    distance_km?: number;
    time_required_minutes?: number;
    energy_level?: "low" | "medium" | "high";
    reason?: string;
    cuisine?: string;
    price_level?: number;
    rating?: number;
    photo_url?: string;
    dietary_match?: boolean;
  };
  time_of_day: "morning" | "afternoon" | "evening";
  duration_minutes: number;
  // Conflict resolution options
  override_conflicts?: boolean; // If true, add even if conflicts exist
  remove_conflicting_activity_ids?: string[]; // IDs of activities to remove if conflicts exist
}

// Activity progress tracking (extends existing IActivity)
export interface IActivityProgress {
  status: "scheduled" | "in_progress" | "completed" | "skipped";
  started_at?: string;
  completed_at?: string;
  skipped_at?: string;
}

// Error response types for during-trip endpoints
export interface IDuringTripErrorResponse {
  error: string;
  details?: string;
  fallback_used?: boolean;
  fallback_type?: "rule_based" | "cached";
}

// Response for accept suggestion endpoint
export interface IAcceptSuggestionResponse {
  success: boolean;
  activity: {
    id: string;
    name: string;
    time_of_day: "morning" | "afternoon" | "evening";
    duration_minutes: number;
  };
  conflicts_detected?: boolean;
  conflicts?: Array<{
    type: "overlap" | "duration_exceeded" | "travel_time_issue";
    time_of_day: "morning" | "afternoon" | "evening";
    description: string;
    conflicting_activities: Array<{
      id: string;
      name: string;
    }>;
  }>;
  conflicts_resolved?: boolean;
  removed_activities?: Array<{
    id: string;
    name: string;
  }>;
}

// Context builder types
export interface IBuildContextParams {
  tripId: string;
  userId: string;
  location?: ILocationRequest;
  supabase: SupabaseClient;
}

export interface IBuildContextResult {
  context: ITripContext | null;
  error?: string;
}

// Trip idea type (without preference field)
export interface ITripIdea {
  id: string;
  trip_id: string;
  title: string;
  summary?: string;
  location?: string;
  place_id?: string;
  time_of_day?: string;
  duration_bucket?: string;
  cost_bucket?: "$" | "$$" | "$$$";
  category?: IdeaCategory;
  tags?: string[];
  enrichment_status?: string;
  latitude?: number;
  longitude?: number;
  // ...other fields as needed
}
import { User } from "@supabase/supabase-js";
import { Request } from "express";

export interface IAuthenticatedRequest extends Request {
  user?: User;
}

export interface IUpdateMemberProfile {
  display_name?: string;
  dietary?: string[];
  travel_style?: string;
  interests?: string[];
  walking_tolerance?: string;
}

export interface IItineraryDay {
  date: string;
  day_number: number;
  activities: IActivity[];
}

export interface IActivityLocation {
  lat: number;
  lng: number;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface IActivity {
  id: string;
  name: string;
  description?: string;
  location?: IActivityLocation;
  latitude?: number;
  longitude?: number;
  duration_minutes?: number;
  duration?: number | string;
  time_of_day?: "morning" | "afternoon" | "evening";
  tags?: string[];
  travel_mode?: "driving" | "walking" | "transit";
}

// Enrichment types for the server
export type IdeaCategory =
  | "food"
  | "sightseeing"
  | "nature"
  | "shopping"
  | "nightlife"
  | "activity"
  | "stay"
  | "other";

export interface PlaceReview {
  authorName: string;
  authorUrl?: string;
  rating: number;
  text?: string;
  time: number;
  relativeTimeDescription: string;
  profilePhotoUrl?: string;
  language?: string;
}

export interface EnrichmentRequest {
  url: string;
  comment?: string;
  trip: {
    destination: string;
    dates: { start: Date; end: Date };
  };
  profile: {
    dietary: string[];
    travelStyle: "chill" | "balanced" | "packed";
    interests: string[];
  };
}

export interface EnrichmentResponse {
  unfurl: {
    title: string;
    thumbnail: string;
    platform: "tiktok" | "youtube";
    embedHtml?: string;
    iframeUrl?: string;
  };
  ai: {
    summary: string;
    tags: string[];
    placeQuery: string;
    category?: IdeaCategory;
    costGuess?: "$" | "$$" | "$$$";
    durationGuess?: "30m" | "1-2h" | "half-day";
    iconType?: string;
  };
  place?: {
    provider: "google";
    placeId: string;
    name: string;
    address?: string;
    lat: number;
    lng: number;
    rating?: number;
    reviewCount?: number;
    priceLevel?: number;
    confidence: "low" | "medium" | "high";
    reviews?: PlaceReview[];
    photoUrl?: string;
    photos?: string[];
  };
}
