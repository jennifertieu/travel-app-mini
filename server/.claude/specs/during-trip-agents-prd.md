# AI Travel App — Product Requirements Document (PRD)

## Product Vision

Build an AI-powered travel companion that reduces decision fatigue during trips and helps travelers spend less time planning and more time enjoying their experience.

**Core promise:**
> Calm, contextual help exactly when it's needed — and silence when it's not.

---

## Target Users

- Anyone traveling (solo, couples, groups)
- Domestic and international travelers
- All trip styles (fast-paced, slow travel, food-first, nature, city)
- Preferences-driven experience (no one-size-fits-all itinerary)

---

## Product Goals

### Primary Goals
- Reduce on-trip stress and decision fatigue
- Provide fast, context-aware recommendations
- Adapt dynamically to real-world changes

### Non-Goals
- Replacing Google Maps
- Becoming a full booking platform
- Forcing rigid itineraries
- Over-notifying users

---

## Key UX Principles

- Default to silence
- Minimal choices (3–5 max)
- Context > completeness
- Suggestions, not commands
- Familiar UI patterns (map-first)
- **UI Pattern**: Structured action buttons (not chat interface for MVP)
  - User taps button: "Decide for me" → Shows 3-5 cards
  - User taps button: "Find food" → Shows restaurant cards
  - No conversation history, just request/response

---

# AI AGENT ARCHITECTURE (Backend)

Agents are modular, composable, and context-driven.
Each agent has a single clear responsibility.

**Agent Orchestration Pattern**: Decision Agent as primary orchestrator
- Single "smart" Decision Agent analyzes user request
- Food and Map logic are implemented as **utility functions** (not separate AI agents)
- Decision Agent calls these functions as OpenAI tools when needed
- This is simpler, cheaper, and faster than multi-agent orchestration
- Each endpoint (`/decide`, `/food`, `/map-intelligence`) can also be called directly

**Important Clarification**: "Food Agent" and "Map Agent" in this document refer to
**TypeScript utility functions**, not separate OpenAI agent loops. They contain the
business logic for food recommendations and map annotations, but don't make their
own OpenAI calls. Only the Decision Agent uses OpenAI for reasoning.

---

## Technical Implementation

### Foundation
- **Language:** TypeScript
- **Framework:** Express
- **AI:** OpenAI GPT-4o / GPT-4o-mini (model selection by agent complexity)
- **Maps:** Google Maps APIs (Places, Geocoding, Distance Matrix)
- **Weather:** Open-Meteo API (free, no API key required, open-source)
- **Database:** Supabase (existing schema)
- **Auth:** Supabase JWT (existing middleware)

### Agent Framework
- **Pattern:** OpenAI function calling (same as itinerary builder)
- **Tool Definitions:** JSON Schema format
- **Execution:** Iterative tool calling until task complete
- **Max Iterations:** 10 (lower than itinerary builder's 20 for real-time performance)
- **Timeout:** 10 seconds per agent call (return fallback if exceeded)

### Model Selection by Agent
| Agent | Model | Temperature | Rationale |
|-------|-------|-------------|-----------|
| Decision Agent | GPT-4o | 0.3 | Needs high quality reasoning, some creativity |
| Food Logic | N/A (utility function) | N/A | No AI calls - uses Google Places API directly |
| Map Logic | N/A (utility function) | N/A | No AI calls - filters and formats data |

**Note**: Food and Map are utility functions that query APIs and format responses.
Only the Decision Agent makes OpenAI calls.

---

## Core Foundation Agent

### 1. Context Agent (Foundational)

**Responsibility**
Maintain real-time situational awareness for all other agents.

**Implementation**: TypeScript function (NOT an OpenAI agent) that queries databases/APIs

**File Structure**:
```
src/utils/contextBuilder.ts  // Function that builds context
src/types/context.ts         // TypeScript interface
```

**Inputs**
- User location (lat/lng from web app - user clicks "fetch location" button)
- Time of day
- Day of trip
- Weather conditions (Open-Meteo API)
- Trip metadata (destination, duration) - from `trips` table
- User preferences - from `member_profiles` table
- Today's scheduled activities - from `trip_itineraries` table
- Energy level (explicit or inferred)

**Output Interface**
```typescript
interface IScheduledActivity {
  id: string;
  title: string;
  scheduled_time: string; // ISO string
  time_of_day: "morning" | "afternoon" | "evening";
  location?: { lat: number; lng: number };
  duration_minutes?: number;
}

interface ITripContext {
  user: {
    id: string;
    location: {
      lat: number;
      lng: number;
      accuracy_meters?: number; // Browser geolocation accuracy
      is_approximate: boolean;  // True if using trip destination fallback
    };
    preferences: {
      travel_style: "chill" | "balanced" | "packed";
      dietary: string[];
      interests: string[];
      walking_tolerance: string; // "low" | "moderate" | "high" - matches existing interface.ts
    };
  };
  trip: {
    id: string;
    destination: string;
    destination_lat: number;
    destination_lng: number;
    day_number: number;
    total_days: number;
    timezone: string; // e.g., "Europe/Paris" - used for time_of_day calculation
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
```

**Caching**: 5-minute TTL to reduce API calls

**Notes**
- This agent never communicates directly with the user.
- It is required for every on-trip interaction.

---

## Primary On-Trip Agents (High Value)

### 2. "What Now?" Decision Agent

**Responsibility**
Answer the core question: *"What should I do right now?"*

**How it's different from itinerary builder:**
- Runs in real-time (not batch)
- Only looks at current moment (not entire trip)
- Provides options (not decisions)
- Considers user location dynamically

**Inputs**
- Context Agent output
- User preferences
- Remaining itinerary (if any)
- Nearby points of interest (Google Places API)

**Output Interface**
```typescript
interface IDecisionOption {
  id: string;
  title: string;               // "Visit Sacré-Cœur"
  type: "scheduled" | "spontaneous" | "rest";
  distance_km: number;
  time_required_minutes: number;
  energy_level: "low" | "medium" | "high";
  reason: string;              // "On your itinerary, 15 min walk"
  coordinates: { lat: number; lng: number };
}

interface IDecisionResponse {
  options: IDecisionOption[];   // 3-5 options
  context_summary: string;      // "Good morning! You have 2 hours before lunch"
  fallback_used?: boolean;      // True if AI timed out and rule-based fallback was used
}
```

**Itinerary Integration** (Gentle Flexibility - Option B)
- Shows scheduled activity as Option 1
- Also shows alternatives: "Or, you could visit Musée Rodin now instead (also on your list)"
- Lets user deviate easily
- Future: Make this a user preference/setting

**Tools this agent needs:**
1. `get_nearby_places` - Search for POIs near user (Google Places Nearby Search)
2. `get_travel_time` - Time from current location to destination (reuse existing `travelTimeBetweenActivities.ts`)
3. `get_scheduled_activities` - Fetch today's activities from itinerary
4. `get_food_recommendations` - Call food utility function for restaurant suggestions
5. `get_itinerary_activity_details` - Fetch details for a specific scheduled activity

**Removed from MVP** (APIs don't exist):
- ~~`check_opening_hours`~~ - Would require expensive Places Details API call; batch with initial search instead
- ~~`call_map_agent`~~ - Map annotations generated separately via `/map-intelligence` endpoint

**Success Criteria**
- User can make a decision in under 10 seconds
- No overwhelming lists or long explanations

---

### 3. Food & Break Utility Function

**Responsibility**
Recommend meals, snacks, or rest at the right time.

**Implementation**: TypeScript utility function (NOT an AI agent) - uses Google Places API directly

**Inputs**
- `ITripContext` object
- Time since last meal (inferred from schedule - MVP assumes 3 hours if unknown)
- Past food preferences (from `member_profiles`)

**Output Interface**
```typescript
interface IFoodRecommendation {
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

interface IFoodResponse {
  recommendations: IFoodRecommendation[];
  suggestion_reason: string; // "It's 12:30pm - time for lunch!"
}
```

**Implementation Details:**
This is a utility function that:
1. Calls Google Places Nearby Search with `type=restaurant|cafe`
2. Filters results by user's dietary preferences (keyword matching)
3. Calculates walking time using existing `travelTimeBetweenActivities.ts`
4. Returns formatted recommendations

**Key Logic:**
- If time > 11am AND time < 2pm → suggest lunch options
- If time > 5pm AND time < 8pm → suggest dinner options
- Filter restaurants by dietary restrictions from user profile
- Sort by: dietary match > rating > distance

**Key Behavior**
- Proactive but gentle nudges (in-app only for web MVP)
- Avoids interrupting unless useful

---

### 4. Map Intelligence Utility Function

**Responsibility**
Enhance (not replace) map navigation by showing scheduled activities and nearby POIs.

**Implementation**: TypeScript utility function (NOT an AI agent) - aggregates and formats data

**Inputs**
- `ITripContext` object
- Map viewport bounds (what user is currently viewing)

**Output Interface**
```typescript
interface IMapAnnotation {
  location: { lat: number; lng: number };
  type: "scheduled" | "recommended" | "food";
  title: string;
  icon: string; // Icon name for frontend
  priority: number; // 1-3 (affects pin size)
  snippet?: string; // Shows on tap
  activity_id?: string; // If type=scheduled, links to itinerary activity
}

interface IMapIntelligenceResponse {
  annotations: IMapAnnotation[];
  center: { lat: number; lng: number }; // Suggested map center
  zoom_level: number; // Suggested zoom
}
```

**Implementation Details:**
This is a utility function that:
1. Fetches today's scheduled activities from itinerary
2. Optionally fetches nearby places from Google Places (if not cached)
3. Formats as map annotations with appropriate icons
4. Returns data for frontend to render

**Removed from MVP** (APIs don't exist):
- ~~`find_scenic_routes`~~ - No Google API for scenic routes
- ~~`check_crowding`~~ - Google Popular Times is NOT available via API
- ~~`route_suggestion`~~ - Requires scenic route data

**MVP Scope:**
- Show scheduled activities as pins
- Show user's current location
- Optionally show nearby restaurants (reuse food function)

**UI Integration:**
- Overlay on Google Maps (using Markers API)
- User taps marker → shows snippet
- User can filter annotations (show/hide categories)

**Notes**
- Sits on top of Google Maps / Mapbox
- Uses familiar navigation patterns

---

## Secondary Agents (Post-MVP / Phase 2)

### 5. Dynamic Itinerary Agent

**Responsibility**
Keep itineraries flexible and guilt-free.

**Capabilities**
- Detect skipped or delayed activities
- Rebalance plans based on context
- Ask before making major changes

---

### 6. Reality Check / FOMO Filter Agent

**Responsibility**
Protect user trust by setting realistic expectations.

**Behaviors**
- Flag overcrowded or overrated attractions
- Offer aligned alternatives
- Provide brief, neutral explanations

---

### 7. Memory & Reflection Agent

**Responsibility**
Passively capture trip highlights.

**Outputs**
- Daily summaries
- Places visited
- Preferences learned for future trips

---

### 8. Group Harmony Agent (Future)

**Responsibility**
Reduce social friction in group travel.

**Capabilities**
- Private preference collection
- Compromise suggestions
- Split-and-rejoin planning

---

# MVP FEATURE PRIORITIZATION

## MVP Definition

**Solve on-trip decision stress with minimal friction.**

If users open the app and immediately feel calmer, the MVP succeeds.

---

## MVP Feature Set (Phase 1)

### Must-Have (Launch)

1. Context Agent
2. “What Now?” Decision Agent
3. Basic Map Overlay
4. Food & Break Suggestions
5. Gentle, opt-in notifications

---

## Phase 2 (Retention & Delight)

- Dynamic itinerary adjustments
- Reality check / FOMO filtering
- Daily recap & memory capture
- Preference learning over time

---

## Phase 3 (Differentiation)

- Group Harmony Agent
- Mood-based recommendations
- Advanced reflection & summaries
- “Local mode” exploration

---

## MVP Anti-Goals

Do NOT:
- Build full itinerary planning first
- Over-customize user profiles
- Add complex settings early
- Compete visually with Google Maps

---

## Success Metrics (Early)

- Time to decision (<10 seconds)
- Reduced app switching (Maps, Yelp)
- Repeat daily usage during trip
- Qualitative feedback: “felt easier / calmer”

---

## Long-Term Vision

Become the trusted, calm layer that sits on top of travel —
not loud, not pushy, and never overwhelming.

> A well-traveled friend in your pocket.

---

# TECHNICAL SPECIFICATIONS

## API Endpoints (New)

All endpoints require authentication (existing `requireAuth` middleware).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/during-trip/context` | Get current trip context |
| POST | `/during-trip/decide` | Get "what now?" suggestions |
| POST | `/during-trip/food` | Get meal/rest suggestions |
| POST | `/during-trip/map-intelligence` | Get map annotations |
| PATCH | `/during-trip/activity/:activityId/status` | Update activity progress |

### Security Requirements

**CRITICAL: Trip Authorization**

Every during-trip endpoint MUST verify the user has access to the requested trip:

```typescript
// REQUIRED in every controller before processing
const verifyTripAccess = async (
  tripId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> => {
  // Check if user is trip creator or member
  const { data: trip, error } = await supabase
    .from("trips")
    .select("id, created_by")
    .eq("id", tripId)
    .single();

  if (error || !trip) return false;

  // User is creator
  if (trip.created_by === userId) return true;

  // TODO: Check trip_members table when group trips are implemented
  return false;
};

// In controller:
if (!(await verifyTripAccess(tripId, userId, supabase))) {
  return response.status(403).json({ error: "Not authorized for this trip" });
}
```

**Location Data Protection**
- NEVER log request bodies containing location coordinates
- Location data is PII and must be handled carefully
- Use separate logging middleware that redacts `location` fields

**Weather API**
- Open-Meteo is free and requires no API key
- All weather calls are server-side only

### Geolocation Handling

**Client-Side Location Fetch**
```typescript
// Frontend sends location when user clicks "fetch location" button
interface ILocationRequest {
  trip_id: string;
  location?: {
    lat: number;
    lng: number;
    accuracy_meters: number; // From browser Geolocation API
  };
}
```

**Server-Side Fallback Logic**
```typescript
const buildUserLocation = (
  requestLocation: ILocationRequest["location"],
  tripDestination: { lat: number; lng: number }
): ITripContext["user"]["location"] => {
  // If no location provided or accuracy is poor (>500m), use trip destination
  if (!requestLocation || requestLocation.accuracy_meters > 500) {
    return {
      lat: tripDestination.lat,
      lng: tripDestination.lng,
      is_approximate: true,
    };
  }

  return {
    lat: requestLocation.lat,
    lng: requestLocation.lng,
    accuracy_meters: requestLocation.accuracy_meters,
    is_approximate: false,
  };
};
```

**Accuracy Thresholds**
- `< 100m` - High accuracy, use as-is
- `100m - 500m` - Medium accuracy, show warning to user
- `> 500m` - Poor accuracy, fall back to trip destination

### Request/Response Examples

**POST /during-trip/decide**
```typescript
// Request
interface IDecideRequest {
  trip_id: string;
  location?: {
    lat: number;
    lng: number;
    accuracy_meters: number;
  };
}

// Response
interface IDecideSuccessResponse {
  options: IDecisionOption[];
  context_summary: string;
  fallback_used?: boolean;
  location_approximate?: boolean; // True if using trip destination
}
```

**PATCH /during-trip/activity/:activityId/status**
```typescript
// Request
{
  trip_id: string;
  status: "scheduled" | "in_progress" | "completed" | "skipped";
  location?: { lat: number; lng: number };
  notes?: string;
}

// Response
{
  success: boolean;
  activity: { id: string; status: string; updated_at: string };
}
```

---

## Database Schema Changes

### MVP Approach: Extend Itinerary JSONB

Instead of creating a new table, extend existing `trip_itineraries` JSONB with progress tracking:

```typescript
// Add to each activity in itinerary:
interface IActivity {
  // ... existing fields
  progress?: {
    status: "scheduled" | "in_progress" | "completed" | "skipped";
    started_at?: string;
    completed_at?: string;
    skipped_at?: string;
  };
}
```

**Endpoint**: `PATCH /during-trip/activity/:activityId/status`
- Updates the `progress` field within the itinerary JSONB
- Simpler for MVP, can migrate to dedicated table later if rich querying needed

### Future: Dedicated Progress Table (Post-MVP)

```sql
CREATE TABLE trip_activity_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, activity_id, user_id)
);
```

---

## Privacy & Data Retention

### What We Store (Persisted)
```typescript
{
  trip_id: string;
  activity_id: string;
  status: "completed" | "skipped";
  completed_at: string; // ISO timestamp
  // NO exact location stored for completed activities
}
```

### What We Use But DON'T Store (Session Only)
```typescript
{
  current_location: { lat: number; lng: number }; // In-memory only
  session_start: string;                          // Not persisted
  last_request_time: string;                      // Not persisted
}
```

### Data Retention Policy
- Delete location history when trip ends (keep only completion status)
- Let users download/delete their data (GDPR compliance)
- Store aggregated summaries only ("visited Louvre"), not exact paths

---

## Rate Limiting & Caching

### Rate Limiting
- **Limit**: Max 20 agent requests per user per day
- **Scope**: Per-user, per-day
- **Response on limit**: HTTP 429 with message and reset time

### Caching Strategy

| Cache Type | TTL | Purpose |
|------------|-----|---------|
| Context | 5 minutes | Avoid rebuilding context on every request |
| Nearby Places | 10 minutes | Google Places API is expensive |
| Agent Responses | 15 minutes | If context hasn't changed much |
| Weather | 30 minutes | Weather doesn't change frequently |

### Cost Estimation
- Decision Agent call: ~$0.02-0.05 per request (GPT-4o + tools)
- Food/Map Agent call: ~$0.002-0.005 per request (GPT-4o-mini)
- With caching: Estimated 50-70% reduction in API calls

---

## Error Handling & Fallback Strategies

### Scenario A: Weather API Down
- **Action**: Show error notification, proceed without weather data
- **Context object**: `environment.weather = null`
- **Agent behavior**: Skip weather-based recommendations

### Scenario B: User GPS Location Unavailable/Inaccurate
- **Action**: Use trip destination as approximate location
- **Fallback**: `user.location = trip.destination_coordinates`
- **UI**: Show indicator that location is approximate

### Scenario C: OpenAI API Slow (>10 seconds) or Fails
- **Action**: Show timeout error with friendly message
- **Fallback**: Return rule-based suggestions (no AI)
- **Rule-based fallback examples**:
  - If morning → suggest breakfast spots from itinerary
  - If afternoon → suggest next scheduled activity
  - If near mealtime → suggest nearby restaurants from cache

### Error Response Format

Following the existing backend pattern from `AGENTS.md`:

```typescript
// Standard error response (matches existing pattern)
interface IErrorResponse {
  error: string;
  details?: string;
}

// Extended error response for during-trip endpoints (when fallback is used)
interface IDuringTripErrorResponse extends IErrorResponse {
  fallback_used?: boolean;
  fallback_type?: "rule_based" | "cached";
  data?: IDecisionResponse | IFoodResponse; // Partial response from fallback
}
```

**Status Codes** (per AGENTS.md):
- `200` - Success
- `400` - Bad request (missing trip_id, invalid location)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not authorized for this trip)
- `404` - Not found (trip doesn't exist, no itinerary)
- `429` - Rate limit exceeded
- `500` - Server error (with details)
- `504` - Gateway timeout (OpenAI timeout, fallback returned)

---

## Architecture Flow Diagram

```
Mobile/Web App Request
       ↓
[POST /during-trip/decide]
       ↓
1. Build Context (contextBuilder.ts)
   ├─ Query user location (from request)
   ├─ Fetch trip data (Supabase)
   ├─ Get weather (Open-Meteo - with fallback)
   └─ Load preferences (Supabase)
       ↓
2. Check Rate Limit
   └─ If exceeded → return 429
       ↓
3. Check Cache
   └─ If valid cached response → return cached
       ↓
4. Route to Appropriate Agent
   ├─ Decision Agent → "What now?"
   ├─ Food Agent → "Where to eat?" (called as tool by Decision Agent)
   └─ Map Agent → "Annotate map" (called as tool by Decision Agent)
       ↓
5. Agent Execution (OpenAI Chat with Tools)
   ├─ System prompt with context
   ├─ Tool calls (Google APIs, Supabase)
   └─ Iterate until done (max 10 turns)
       ↓
6. Cache Response
       ↓
7. Format & Return JSON to App
```

---

## Testing Approach

### Test Scripts (TypeScript)
Following the pattern of `aiItineraryBuilderTestFunction.ts`:

```
server/
├── src/
│   └── utils/
│       ├── contextBuilderTestFunction.ts   # Test context building
│       ├── decisionAgentTestFunction.ts    # Test decision agent
│       └── foodAgentTestFunction.ts        # Test food agent
```

### Test Script Structure
```typescript
// Example: decisionAgentTestFunction.ts
import { ITripContext, IScheduledActivity } from "../types/interface.js";

const mockScheduledActivities: IScheduledActivity[] = [
  {
    id: "eiffel-tower",
    title: "Visit Eiffel Tower",
    scheduled_time: "2026-05-02T14:00:00Z",
    time_of_day: "afternoon",
    location: { lat: 48.8584, lng: 2.2945 },
    duration_minutes: 120,
  },
];

const mockContext: ITripContext = {
  user: {
    id: "test-user-1",
    location: {
      lat: 48.8606,
      lng: 2.3376, // Near Louvre
      accuracy_meters: 10,
      is_approximate: false,
    },
    preferences: {
      travel_style: "balanced",
      dietary: ["vegetarian"],
      interests: ["museums", "food"],
      walking_tolerance: "moderate", // string, matches interface.ts
    },
  },
  trip: {
    id: "paris-trip-1",
    destination: "Paris, France",
    destination_lat: 48.8566,
    destination_lng: 2.3522,
    day_number: 2,
    total_days: 5,
    timezone: "Europe/Paris",
  },
  temporal: {
    current_time: "2026-05-02T10:30:00+02:00", // In trip timezone
    time_of_day: "morning",
    local_timezone: "Europe/Paris",
  },
  environment: {
    weather: {
      condition: "sunny",
      temperature: 18,
      precipitation: false,
    },
  },
  schedule: {
    next_activity: mockScheduledActivities[0],
    time_until_next: 210, // 3.5 hours
    today_activities: mockScheduledActivities,
  },
};

// Run test
const result = await runDecisionAgent(mockContext);
console.log(JSON.stringify(result, null, 2));
```

### Running Tests
```bash
cd server
pnpm tsx src/utils/contextBuilderTestFunction.ts
pnpm tsx src/utils/decisionAgentTestFunction.ts
pnpm tsx src/utils/foodAgentTestFunction.ts
```

---

## File Structure (New Files)

```
server/src/
├── controllers/
│   └── duringTrip.controller.ts      # Request handlers for during-trip endpoints
├── routes/
│   └── duringTrip.routes.ts          # Route definitions
├── tools/
│   └── duringTripAgentTools.ts       # OpenAI tool definitions for Decision Agent
├── types/
│   └── interface.ts                  # ADD new interfaces here (ITripContext, etc.)
│                                     # Keep all types in one file per project convention
├── utils/
│   ├── contextBuilder.ts             # Build ITripContext from various sources
│   ├── decisionAgent.ts              # Decision Agent (OpenAI agent with tools)
│   ├── foodRecommendations.ts        # Food utility function (NOT an AI agent)
│   ├── mapIntelligence.ts            # Map utility function (NOT an AI agent)
│   ├── weatherService.ts             # Open-Meteo API wrapper
│   ├── verifyTripAccess.ts           # Trip authorization helper
│   ├── contextBuilderTestFunction.ts # Test script for context builder
│   ├── decisionAgentTestFunction.ts  # Test script for decision agent
│   └── foodRecommendationsTestFunction.ts # Test script for food function
└── middleware/
    └── rateLimitDuringTrip.ts        # Rate limit middleware for during-trip routes
```

**Note on types**: Per project convention (`AGENTS.md`), all TypeScript interfaces
should be added to the existing `src/types/interface.ts` file rather than creating
separate type files.

---

## Environment Variables (New)

| Variable | Purpose |
|----------|---------|
| `DURING_TRIP_RATE_LIMIT` | Max requests per user per day (default: 20) |
| `DURING_TRIP_CACHE_TTL` | Cache TTL in seconds (default: 300) |

**Note**: Open-Meteo API is free and requires no API key.
