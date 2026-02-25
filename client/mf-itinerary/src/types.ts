export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface Activity {
  name: string;
  location: string;
  description?: string;
  time_of_day: TimeOfDay;
  duration_minutes: number;
  category?: string;
  must_capture?: boolean;
  image_url?: string;
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
