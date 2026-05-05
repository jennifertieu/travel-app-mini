export type TimeOfDay = "morning" | "afternoon" | "evening";

// --- Chat agent types ---

export type ChatRole = "user" | "agent" | "system";
export type ChatStatus = "idle" | "streaming" | "awaiting_confirmation" | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  toolCalls?: string[];
  isStreaming?: boolean;
  variant?: "default" | "danger";
}

export interface IItineraryChange {
  type: "add" | "remove" | "move" | "swap" | "add_travel" | "remove_travel";
  description: string;
  before?: { day_number: number; time_of_day: string; activity_name: string };
  after?: { day_number: number; time_of_day: string; activity_name: string };
}

/** Location from API can be a display string or an object (e.g. { lat, lng, name }). */
export type ActivityLocation =
  | string
  | { lat?: number; lng?: number; name?: string; address?: string };

export interface Activity {
  title: string;
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
  cost_estimate?: number;
  cost_type?: "food" | "activity";
  place?: {
    photoUrl?: string;
    photos?: string[];
  };
}

export interface ItineraryDay {
  day_number: number;
  date: string;
  activities: Activity[];
  transport_estimate?: number;
  transport_note?: string;
}

export interface FreeTimeSlot {
  timeOfDay: TimeOfDay;
  position: number;
  freedMinutes: number;
}

// --- Budget & Travel types ---

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

// --- Guide types ---

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

// --- Photo Guide types ---

export type PhotoChallengeDifficulty = "easy" | "medium" | "silly";

export interface PhotoChallenge {
  description: string;
  difficulty: PhotoChallengeDifficulty;
}

export interface PhotoTip {
  activity_name: string;
  image_url?: string;
  image_urls?: string[];
  generated_selfie_base64?: string;
  generated_selfie_url?: string;
  selfie_tip: string;
  pose_idea: string;
  best_time: string;
  is_group_spot: boolean;
  group_tip?: string;
  challenge?: PhotoChallenge;
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

// --- Itinerary data ---

export interface ItineraryData {
  trip_name?: string;
  destination?: string;
  days: ItineraryDay[];
  budget?: BudgetSummary;
  flights?: FlightSearchResult;
  hotel?: HotelRecommendation | null;
}
