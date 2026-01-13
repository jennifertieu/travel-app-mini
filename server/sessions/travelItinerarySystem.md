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

- Fetch trip details and all enriched ideas from Supabase.
- Fetch member reactions for those ideas from `trip_reel_idea_reactions` table.
- Aggregate reaction counts per idea (fire, down, meh, skip votes).
- Filter out ideas with high negative votes (more meh+skip than fire+down).
- Rank remaining ideas by fire votes first, then down votes.
- Validate trip dates.
- Use the AI itinerary builder agent with filtered, ranked ideas to:
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

#### New Voting System Types

- `IIdeaReactionCounts`: Aggregated reaction counts per idea (fire, down, meh, skip)
- `ITripIdea`: Trip idea structure without deprecated preference field

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
  cost_bucket TEXT, -- '$', '$$', '$$$'
  category TEXT,
  tags TEXT[],
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  enrichment_status TEXT, -- 'finished', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3. `trip_reel_idea_reactions`

Stores member reactions (votes) for trip ideas.

```sql
CREATE TABLE trip_reel_idea_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES trip_reel_ideas(id) ON DELETE CASCADE,
  member_id UUID REFERENCES member_profiles(id),
  member_name TEXT,
  signal TEXT CHECK (signal IN ('fire', 'down', 'meh', 'skip')),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(idea_id, member_id)
);
```

---

### 4. `trip_itineraries`

Stores the generated itinerary for a trip.

```sql
CREATE TABLE trip_itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  trip_id UUID NULL,
  itinerary JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT trip_itineraries_pkey PRIMARY KEY (id),
  CONSTRAINT trip_itineraries_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips (id)
);
```

---

## How It Works

1. **Client calls** `POST /itinerary/:id` with a trip ID.
2. **Controller** fetches trip data and all enriched ideas for the trip.
3. **Controller** fetches all member reactions for those ideas and aggregates vote counts.
4. **Controller** filters out ideas with more negative votes than positive votes.
5. **Controller** ranks remaining ideas by fire votes (highest priority), then down votes.
6. **Controller** validates trip dates and invokes the AI agent with the filtered, ranked ideas.
7. **AI agent** uses tools to build the itinerary step-by-step, checking for conflicts and optimizing activity placement.
8. **Final itinerary** is saved to Supabase and returned to the client.

---

## Recent Updates (January 2026)

### Voting-Based Idea Selection System

- **Replaced single preference field** with member-specific voting system using `trip_reel_idea_reactions` table.
- **Vote types:** `fire` (highest priority), `down` (secondary priority), `meh` (neutral), `skip` (exclude).
- **Filtering logic:** Ideas are excluded if they have more `meh` + `skip` votes than `fire` + `down` votes.
- **Ranking logic:** Remaining ideas are sorted by `fire` votes (descending), then `down` votes (descending).
- **Updated location handling:** Uses separate `latitude` and `longitude` columns instead of JSON location field.
- **Cost bucket standardization:** Enforced `$`, `$$`, `$$$` format for cost buckets.

### Code Quality Improvements

- **Switch statements:** Replaced multiple else-if chains with switch statements for better readability (e.g., reaction signal processing).
- **Descriptive variable names:** Improved variable naming conventions (e.g., `ideaA`/`ideaB` instead of `a`/`b`, `countsA`/`countsB` instead of `ca`/`cb`).
- **Readable filtering:** Enhanced filtering logic with descriptive variable names (`positiveVotes`, `negativeVotes`).

### Updated Types

- Added `IIdeaReactionCounts` interface for aggregated reaction counts.
- Added `ITripIdea` interface without deprecated preference field.
- Updated `IActivityLocation` to support both `lat/lng` and `latitude/longitude` formats.

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
