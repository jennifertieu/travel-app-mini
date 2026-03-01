# mf-itinerary Data Reference

A guide for the AI agent working in `mf-itinerary` — what data exists, where it lives, and what can be read or updated.

## What's available at a glance

**Trip**
- destination name, lat/lng
- start & end dates, duration in days
- budget level (e.g. "mid-range")
- interests array
- who created it

**Itinerary days & activities**
- each day has a date, day number, and list of activities
- each activity has: name, description, location (string or lat/lng), time of day (morning/afternoon/evening), duration in minutes, category, cost estimate (USD), cost type (food vs activity), photo URL, coordinates
- each day also has a transport cost estimate + note (e.g. "Airport transfer + metro")

**Budget**
- flights total (USD)
- hotel total (USD, nightly rate × trip days)
- activities total (USD)
- food total (USD)
- transport total (USD)
- grand total + per-day average

**Flights** (from Amadeus, AI-ranked)
- up to 3 outbound options + up to 3 return options
- each option: airline, flight number, departure/arrival airports + times, stops, total duration, price (USD), cabin class, airline logo URL, AI summary, recommended flag
- which outbound and return are currently selected

**Hotel** (AI-picked from the ideas pool)
- name, address, rating (0–5), photo URL
- nightly rate (USD)
- lat/lng coordinates
- reason it was selected (e.g. "Top-rated stay and closest to your activities")
- link back to the original idea (`ideaId`)

**Ideas pool** (`trip_reel_ideas` — the raw source material)
- all the places/activities the group added pre-trip
- each idea has: title, summary, category (stay/food/activity/etc.), tags, cost bucket, time of day preference, Google Places data (rating, address, photos, coordinates), enrichment status
- reactions per idea: fire 🔥 / down 👎 / meh 😐 / skip — used to rank what made it into the itinerary

**Member profiles** (useful for personalization)
- display name, hometown (used as flight origin city)
- travel style, interests, dietary preferences, walking tolerance

**Photo guides** (per day)
- selfie tips, pose ideas, best time to shoot, group tips
- photo challenges with difficulty levels
- pose of the day

---

## Primary Data Source: `trip_itineraries`

The main table. One row per trip. The entire itinerary (days, budget, flights, hotel) lives in a single `itinerary` JSON column.

```ts
// Supabase table: trip_itineraries
{
  id: string;
  trip_id: string;          // FK → trips.id
  itinerary: ItineraryData; // the big JSON blob (see below)
  created_at: string;
  updated_at: string | null;
}
```

### How to read it
```ts
const { data } = await supabase
  .from('trip_itineraries')
  .select('*')
  .eq('trip_id', tripId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

// NOTE: the itinerary may be nested — always unwrap like this:
const itinerary = data.itinerary?.itinerary ?? data.itinerary;
```

### How to update it
```ts
await supabase
  .from('trip_itineraries')
  .update({ itinerary: updatedItinerary })
  .eq('id', row.id);
```

---

## `ItineraryData` Shape

```ts
interface ItineraryData {
  trip_name?: string;
  destination?: string;
  days: ItineraryDay[];
  budget?: BudgetSummary;
  flights?: FlightSearchResult;
  hotel?: HotelRecommendation | null;
}
```

---

## Days & Activities

```ts
interface ItineraryDay {
  day: number;                    // 1-indexed
  date: string;                   // ISO date string e.g. "2025-06-01"
  activities: Activity[];
  transport_estimate?: number;    // USD per person for local transport that day
  transport_note?: string;        // e.g. "Airport transfer + metro"
}

interface Activity {
  name: string;
  location?: string | { lat?: number; lng?: number; name?: string; address?: string };
  description?: string;
  summary?: string;
  time_of_day: "morning" | "afternoon" | "evening";
  duration_minutes: number;
  category?: string;
  must_capture?: boolean;         // photo-worthy flag
  image_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  cost_estimate?: number;         // USD per person
  cost_type?: "food" | "activity";
  place?: {
    photoUrl?: string;
    photos?: string[];
  };
}
```

The AI agent can add, remove, move, or swap activities by mutating `itinerary.days` and saving back.

---

## Budget

```ts
interface BudgetSummary {
  flights: number;        // USD — sum of selected outbound + return flight prices
  hotel: number;          // USD — nightlyRate × tripDays
  activities: number;     // USD — sum of activity cost_estimates (cost_type = "activity")
  food: number;           // USD — sum of activity cost_estimates (cost_type = "food")
  transport: number;      // USD — sum of transport_estimate across all days
  total: number;          // sum of all above
  per_day_average: number;
  group_total?: number;   // optional, if travelers > 1
  travelers?: number;
}
```

Budget is recalculated server-side via `POST /api/itinerary/:tripId/recalculate-budget`.
The agent can also update individual `cost_estimate` fields on activities and recompute totals manually.

---

## Flights

```ts
interface FlightSearchResult {
  outbound: FlightOption[];
  return: FlightOption[];
  selectedOutbound: number;   // index into outbound[]
  selectedReturn: number;     // index into return[]
  originCity: string;
  originAirport: string;      // IATA code e.g. "JFK"
  destinationAirport: string; // IATA code e.g. "CDG"
}

interface FlightOption {
  id: string;
  direction: "outbound" | "return";
  segments: FlightSegment[];
  totalDurationMinutes: number;
  stops: number;
  priceTotal: number;         // USD
  priceCurrency: string;
  cabinClass: string;         // e.g. "ECONOMY"
  airlineLogo: string;        // URL
  summary: string;            // AI-generated one-liner
  recommended: boolean;       // AI-picked best option
}

interface FlightSegment {
  airline: string;
  airlineCode: string;        // IATA e.g. "AA"
  flightNumber: string;       // e.g. "AA123"
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;      // ISO datetime
  arrivalTime: string;        // ISO datetime
  durationMinutes: number;
}
```

### Updating flight selection
The agent can update `selectedOutbound` / `selectedReturn` and recalculate `budget.flights`:
```ts
itinerary.flights.selectedOutbound = newIndex;
const outPrice = itinerary.flights.outbound[itinerary.flights.selectedOutbound].priceTotal;
const retPrice = itinerary.flights.return[itinerary.flights.selectedReturn].priceTotal;
itinerary.budget.flights = outPrice + retPrice;
itinerary.budget.total = itinerary.budget.activities + itinerary.budget.food +
  itinerary.budget.transport + itinerary.budget.flights + itinerary.budget.hotel;
```

Or call the server endpoint: `PATCH /api/itinerary/:tripId/flights/select`

---

## Hotel

```ts
interface HotelRecommendation {
  ideaId: string;           // FK → trip_reel_ideas.id (the source idea)
  name: string;
  reason: string;           // e.g. "Top-rated stay and closest to your activities"
  rating: number | null;    // Google Places rating (0–5)
  address: string | null;
  photoUrl: string | null;
  nightlyRate: number | null; // USD
  latitude: number | null;
  longitude: number | null;
}
```

The hotel is auto-selected from `trip_reel_ideas` where `category = 'stay'` and `enrichment_status = 'DONE'`.
The agent can override `itinerary.hotel` with a different idea from that pool.

---

## Supporting Tables

### `trips` — trip metadata
```ts
{
  id: string;
  destination: string;
  title: string | null;
  start_date: string | null;   // ISO date
  end_date: string | null;     // ISO date
  duration_days: number | null;
  budget_level: string | null; // e.g. "mid-range"
  interests: string[] | null;
  destination_lat: number | null;
  destination_lng: number | null;
  created_by: string;          // FK → member_profiles.id
}
```

### `trip_reel_ideas` — the raw ideas pool (source for activities & hotel)
```ts
{
  id: string;
  trip_id: string;
  title: string | null;
  summary: string | null;
  category: string | null;     // "stay" for hotels, "food", "activity", etc.
  enrichment_status: string;   // "DONE" = ready to use
  latitude: number | null;
  longitude: number | null;
  place: {                     // Google Places enrichment
    rating?: number;
    address?: string;
    photoUrl?: string;
    photos?: string[];
    latitude?: number;
    longitude?: number;
    nightlyRate?: number;      // hotels only
  } | null;
  cost_bucket: string | null;  // "budget" | "mid" | "luxury"
  duration_bucket: string | null;
  time_of_day: string | null;
  tags: string[] | null;
}
```

### `member_profiles` — user preferences (relevant for personalization)
```ts
{
  user_id: string;
  display_name: string | null;
  hometown: string | null;     // used for flight origin city
  travel_style: string | null;
  interests: string[] | null;
  dietary: string[] | null;
  walking_tolerance: string | null;
}
```

### `trip_photo_guides` — per-day photo guide data
```ts
{
  trip_id: string;
  day_number: number;
  guide_data: PhotoGuideData;  // tips, poses, challenges per activity
}
```

---

## Server Endpoints (for heavy operations)

| Method | Path | What it does |
|--------|------|--------------|
| `POST` | `/api/itinerary/:tripId` | Generate full itinerary from ideas |
| `POST` | `/api/itinerary/:tripId/recalculate-budget` | Re-run AI cost enrichment |
| `PATCH` | `/api/itinerary/:tripId/flights/select` | Update selected flight index |
| `POST` | `/api/itinerary/:tripId/flights/regenerate` | Re-search Amadeus for new flights |

For everything else (reading/updating the itinerary JSON, swapping activities, changing hotel), go directly through Supabase.

---

## What the AI Agent Can Safely Mutate

| Field | Safe to update directly via Supabase |
|-------|--------------------------------------|
| `itinerary.days[n].activities` | Yes — add, remove, reorder |
| `itinerary.days[n].transport_estimate` | Yes |
| `itinerary.days[n].transport_note` | Yes |
| `activity.cost_estimate` | Yes |
| `activity.cost_type` | Yes |
| `itinerary.budget.*` | Yes — recalculate after changes |
| `itinerary.flights.selectedOutbound/Return` | Yes — update + recalc budget.flights |
| `itinerary.hotel` | Yes — swap to any `trip_reel_ideas` row with `category='stay'` |
| `itinerary.flights.outbound/return` | No — regenerate via server endpoint |
