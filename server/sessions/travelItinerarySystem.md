# Travel Itinerary System – Session Summary

## Overview

We built a modular backend system for generating optimized travel itineraries using Node.js, Express, Supabase, and OpenAI function calling. The system is designed to create, validate, and store trip itineraries based on user preferences and available activities.

---

## Main Features

### 1. API Endpoints

- **POST /itinerary/:id**
  - Triggers itinerary creation for a specific trip.
  - Requires authentication (`requireAuth` middleware).
  - Implemented in [server/src/controllers/itinerary.controller.ts](server/src/controllers/itinerary.controller.ts).

### 2. Itinerary Generation Flow

- Fetch trip details and ideas from Supabase.
- Validate trip dates.
- Use the AI itinerary builder agent to:
  - Assign activities to days and time slots.
  - Check for scheduling conflicts and travel times.
  - Add open/free time slots for flexibility.
- Save the generated itinerary to Supabase.

### 3. AI Agent & Tools

- **Agent:** [server/src/utils/aiItineraryBuilderAgent.ts](server/src/utils/aiItineraryBuilderAgent.ts)

  - Uses OpenAI’s function calling to iteratively build the itinerary.
  - Employs custom tools for itinerary logic.

- **Tools:** [server/src/tools/itineraryAgentTools.ts](server/src/tools/itineraryAgentTools.ts)
  - `assign_activity_to_day`: Assigns activities to specific days/time slots.
  - `get_travel_time_between_activities`: Calculates travel time using Google Maps API.
  - `check_day_conflicts`: Validates for time/duration conflicts.
  - `get_activity_details`: Retrieves details for an activity.
  - `create_open_slot`: Adds open slots for free time.

### 4. Supporting Utilities

- [assignActivityToDay.ts](server/src/utils/assignActivityToDay.ts): Assigns activities to itinerary days.
- [checkDayConflicts.ts](server/src/utils/checkDayConflicts.ts): Checks for slot duration and travel time issues.
- [createOpenSlot.ts](server/src/utils/createOpenSlot.ts): Adds open slots to itinerary days.
- [getActivityDetails.ts](server/src/utils/getActivityDetails.ts): Returns activity details.
- [getDurationMinutes.ts](server/src/utils/getDurationMinutes.ts): Normalizes activity duration.
- [travelTimeBetweenActivities.ts](server/src/utils/travelTimeBetweenActivities.ts): Calculates travel time using Google Maps.

### 5. Types & Data Structures

Defined in [server/src/types/interface.ts](server/src/types/interface.ts):

#### Core Request/Response Types

- `IAuthenticatedRequest`: Extends Express Request with optional Supabase User
- `IUpdateMemberProfile`: Interface for updating user profile data (display_name, dietary, travel_style, interests, walking_tolerance)

#### Itinerary & Activity Types

- `IItineraryDay`: Structure for a single day in itinerary (date, day_number, activities array)
- `IActivity`: Core activity structure with id, name, description, location, duration, time_of_day, tags, travel_mode
- `IActivityLocation`: Location data with lat/lng coordinates and optional address

#### Enrichment System Types

- `IdeaCategory`: Type alias for activity categories ("food" | "sightseeing" | "nature" | "shopping" | "nightlife" | "activity" | "stay" | "other")
- `PlaceReview`: Google Places review structure with author, rating, text, time data
- `EnrichmentRequest`: Input structure for enriching trip ideas with URL, comment, trip details, and user profile
- `EnrichmentResponse`: Complete enrichment output including unfurl data (title, thumbnail, platform), AI analysis (summary, tags, place query, category, cost/duration guesses), and optional place data from Google Places API

---

## Database Table Structures

### 1. `trips`

Stores metadata for each trip.

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  destination TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  start_date DATE,
  end_date DATE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 2. `trip_reel_ideas`

Stores all activity ideas for a trip.

```sql
CREATE TABLE trip_reel_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT,
  summary TEXT,
  location TEXT,
  place_id TEXT,
  time_of_day TEXT, -- 'morning', 'afternoon', 'evening'
  duration_bucket TEXT,
  cost_bucket TEXT,
  category TEXT,
  tags TEXT[],
  preference TEXT, -- 'fire', 'down', 'meh', 'skip'
  enrichment_status TEXT, -- 'finished', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3. `trip_itineraries`

Stores the generated itinerary for a trip.

```sql
CREATE TABLE trip_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  itinerary_data JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(trip_id)
);
```

---

## How It Works

1. **Client calls** `POST /itinerary/:id` with a trip ID.
2. **Controller** fetches trip and activity data, validates, and invokes the AI agent.
3. **AI agent** uses tools to build the itinerary step-by-step, checking for conflicts and optimizing activity placement.
4. **Final itinerary** is saved to Supabase and returned to the client.

---

## References

- Main entry: [server/src/app.ts](server/src/app.ts)
- Controller: [server/src/controllers/itinerary.controller.ts](server/src/controllers/itinerary.controller.ts)
- AI Agent: [server/src/utils/aiItineraryBuilderAgent.ts](server/src/utils/aiItineraryBuilderAgent.ts)
- Tools: [server/src/tools/itineraryAgentTools.ts](server/src/tools/itineraryAgentTools.ts)
- Utilities: [server/src/utils/](server/src/utils/)
- Types: [server/src/types/interface.ts](server/src/types/interface.ts)

---

_This file summarizes the itinerary system for future reference and onboarding._
