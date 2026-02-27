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

export type ChatRole = "agent" | "user";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
}

/** Describes a free time slot to render where deleted activities were */
export interface FreeTimeSlot {
  timeOfDay: TimeOfDay;
  position: number; // index in the section where the card appears
  freedMinutes: number; // total freed duration
}

// Photo Guide (selfie tips, poses, challenges)
export type PhotoChallengeDifficulty = "easy" | "medium" | "silly";

export interface PhotoChallenge {
  description: string;
  difficulty: PhotoChallengeDifficulty;
}

export interface PhotoTip {
  activity_name: string;
  image_url?: string;
  /** Multiple Google (Places) photos for this activity; first is used for selfie generation. */
  image_urls?: string[];
  /** Cached AI-generated selfie image (base64), when available. */
  generated_selfie_base64?: string;
  selfie_tip: string;
  pose_idea: string;
  best_time: string;
  is_group_spot: boolean;
  group_tip?: string;
  challenge?: PhotoChallenge;
  /** Rich scene description for AI image generation (location, lighting, composition, pose). */
  image_prompt?: string;
}

export interface PoseOfTheDay {
  title: string;
  description: string;
  difficulty: PhotoChallengeDifficulty;
}

export interface PhotoGuideData {
  pose_of_the_day: PoseOfTheDay;
  tips: PhotoTip[];
}
