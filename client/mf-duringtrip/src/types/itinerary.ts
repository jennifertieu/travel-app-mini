export type TimeOfDay = "morning" | "afternoon" | "evening";

/** Location from API can be a display string or an object (e.g. { lat, lng, name }). */
export type ActivityLocation =
  | string
  | { lat?: number; lng?: number; name?: string; address?: string };

export interface Activity {
  name: string;
  location?: ActivityLocation;
  description?: string;
  summary?: string;
  time_of_day: TimeOfDay;
  duration_minutes: number;
  category?: string;
  must_capture?: boolean;
  image_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  // Populated from reel idea's Google Places match (pre-trip enrichment)
  place?: {
    photoUrl?: string;
    photos?: string[];
  };
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: Activity[];
}

export interface ItineraryData {
  trip_name?: string;
  destination?: string;
  days: ItineraryDay[];
}
