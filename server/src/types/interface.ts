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
