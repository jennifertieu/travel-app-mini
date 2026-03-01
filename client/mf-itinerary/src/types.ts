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
  cost_estimate?: number;
  cost_type?: "food" | "activity";
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
  transport_estimate?: number;
  transport_note?: string;
}

export interface BudgetSummary {
  flights: number;
  hotel: number;
  activities: number;
  food: number;
  transport: number;
  total: number;
  per_day_average: number;
  group_total?: number;
  travelers?: number;
}

export interface FlightSegment {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
}

export interface FlightOption {
  id: string;
  direction: "outbound" | "return";
  segments: FlightSegment[];
  totalDurationMinutes: number;
  stops: number;
  priceTotal: number;
  priceCurrency: string;
  cabinClass: string;
  airlineLogo: string;
  summary: string;
  recommended: boolean;
}

export interface FlightSearchResult {
  outbound: FlightOption[];
  return: FlightOption[];
  selectedOutbound: number;
  selectedReturn: number;
  originCity: string;
  originAirport: string;
  destinationAirport: string;
}

export interface HotelRecommendation {
  ideaId: string;
  name: string;
  reason: string;
  rating: number | null;
  address: string | null;
  photoUrl: string | null;
  nightlyRate: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ItineraryData {
  trip_name?: string;
  destination?: string;
  days: ItineraryDay[];
  budget?: BudgetSummary;
  flights?: FlightSearchResult;
  hotel?: HotelRecommendation | null;
}

export type ChatRole = "agent" | "user" | "system";

export interface IItineraryChange {
  type: "add" | "remove" | "move" | "swap" | "add_travel" | "remove_travel";
  description: string;
  before?: {
    day_number: number;
    time_of_day: string;
    activity_name: string;
  };
  after?: {
    day_number: number;
    time_of_day: string;
    activity_name: string;
  };
}

export type ChatStatus =
  | "idle"
  | "streaming"
  | "awaiting_confirmation"
  | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  /** Tool names called by the agent while generating this message */
  toolCalls?: string[];
  /** Visual variant for system messages */
  variant?: "default" | "danger";
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

export interface GuideSection {
  id: string;
  icon: string;
  title: string;
  tips: string[];
}

export interface DestinationGuide {
  destination: string;
  sections: GuideSection[];
  generated_at: string;
}

export interface ActivitySpotlight {
  activity_name: string;
  hero_photo?: string;
  editorial_blurb: string;
  insider_tips: string[];
  best_time: string;
  budget_tip: string;
  etiquette_tip?: string;
}

export interface ActivitySpotlightsGuide {
  destination: string;
  spotlights: ActivitySpotlight[];
  generated_at: string;
}
