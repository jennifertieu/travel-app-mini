export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface IActivity {
  id: string;
  title: string;
  location: string;
  latitude?: number;
  longitude?: number;
  duration_bucket?: string; // "30min", "1hour", "2hours", etc.
  duration_minutes?: number;
  time_of_day: TimeOfDay;
  summary?: string;
  description?: string;
  tags?: string[];
  image_url?: string;
}

export interface IItineraryDay {
  date: string; // ISO date: "2024-06-01"
  day_number: number;
  activities: IActivity[];
}

export interface IItinerary {
  trip_id: string;
  trip_title: string;
  destination: string;
  start_date: string;
  end_date: string;
  days: IItineraryDay[];
  activities_pool?: IActivity[];
}
