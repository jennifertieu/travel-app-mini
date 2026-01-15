# AI Itinerary Builder

A comprehensive AI-powered system that generates optimized travel itineraries using OpenAI's function calling capabilities, Google Maps API for travel time calculations, and a voting-based activity selection system.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [API Reference](#api-reference)
4. [AI Agent System](#ai-agent-system)
5. [Available Tools](#available-tools)
6. [Utility Functions](#utility-functions)
7. [Data Structures](#data-structures)
8. [Voting & Filtering System](#voting--filtering-system)
9. [Post-Processing](#post-processing)
10. [Configuration & Dependencies](#configuration--dependencies)
11. [Testing & Verification](#testing--verification)

---

## Executive Summary

### What It Does

The AI Itinerary Builder automatically generates optimized day-by-day travel itineraries for trips. Given a set of activities that trip members have voted on, it:

- **Schedules activities** across trip days and time slots (morning, afternoon, evening)
- **Optimizes travel logistics** by grouping nearby activities and calculating real travel times
- **Handles multi-city trips** by adding explicit travel segments between locations
- **Respects member preferences** through a voting-based filtering and ranking system
- **Fills gaps intelligently** with free time slots for flexibility

### Key Benefits

- **Autonomous Planning**: The AI agent iteratively builds the itinerary using tools, mimicking how a human travel planner would work
- **Real-World Accuracy**: Uses Google Maps Distance Matrix API for actual travel times
- **Democratic Selection**: Activities are included based on group voting, not arbitrary selection
- **Conflict Detection**: Validates schedules to prevent overbooking time slots

### Use Cases

- Group trip planning where multiple members contribute activity ideas
- Multi-city itineraries requiring travel coordination
- Trips where activity preferences need to be balanced across participants

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Application                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ POST /itinerary/:id
┌─────────────────────────────────────────────────────────────────────────┐
│                         Express Server (app.ts)                          │
│  ├── requireAuth middleware (JWT validation via Supabase)               │
│  └── itinerary.controller.ts                                            │
│       ├── Fetch trip data from Supabase                                 │
│       ├── Fetch & filter ideas based on votes                           │
│       └── Invoke AI Agent                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI Itinerary Builder Agent                            │
│  (aiItineraryBuilderAgent.ts)                                           │
│  ├── Constructs initial prompt with trip + activities                   │
│  ├── Iterative loop (max 20 iterations)                                 │
│  │    ├── Send messages to OpenAI (gpt-4o)                              │
│  │    ├── Process tool calls                                            │
│  │    └── Append results to conversation                                │
│  └── Post-processing (fill empty slots)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │ OpenAI    │   │ Google    │   │ Supabase  │
            │ API       │   │ Maps API  │   │ Database  │
            └───────────┘   └───────────┘   └───────────┘
```

### Data Flow

1. **Request Received**: Client sends `POST /itinerary/:tripId` with Bearer token
2. **Authentication**: `requireAuth` middleware validates JWT via Supabase
3. **Data Fetching**: Controller fetches trip details and all enriched ideas
4. **Reaction Aggregation**: Fetches all member reactions and aggregates vote counts
5. **Filtering & Ranking**: Removes negatively-voted ideas, ranks remainder by popularity
6. **AI Agent Invocation**: Passes filtered ideas to the AI agent
7. **Iterative Building**: Agent uses tools to assign activities, check conflicts, add travel
8. **Post-Processing**: Empty time slots filled with "Free Time" activities
9. **Persistence**: Final itinerary saved to `trip_itineraries` table
10. **Response**: Success status returned to client

---

## API Reference

### Create Itinerary

**Endpoint**: `POST /itinerary/:id`

**Authentication**: Required (Bearer token)

**Path Parameters**:

| Parameter | Type   | Description                        |
| --------- | ------ | ---------------------------------- |
| `id`      | string | UUID of the trip to generate for   |

**Request Headers**:

```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request Body**: None required

**Success Response** (200):

```json
{
  "success": true,
  "tripId": "uuid-of-trip",
  "activitiesCount": 12
}
```

**Error Responses**:

| Status | Error                                           | Cause                                      |
| ------ | ----------------------------------------------- | ------------------------------------------ |
| 401    | `No token provided`                             | Missing Authorization header               |
| 401    | `Invalid or expired token`                      | JWT validation failed                      |
| 404    | `<supabase_error>`                              | Trip not found                             |
| 400    | `Trip must have both start_date and end_date`  | Missing date fields                        |
| 400    | `Trip start_date must be before end_date`      | Invalid date range                         |
| 400    | `No suitable ideas found for itinerary...`     | All ideas filtered out by voting           |
| 500    | `Failed to save itinerary`                      | Database write error                       |
| 500    | `Failed to generate itinerary`                  | AI agent error or max iterations reached   |

**Code Reference**: [itinerary.controller.ts](../src/controllers/itinerary.controller.ts)

---

## AI Agent System

### Overview

The AI agent uses OpenAI's function calling (tool use) to iteratively build itineraries. Rather than generating a complete itinerary in one shot, it makes decisions step-by-step, using tools to validate each action.

**Code Reference**: [aiItineraryBuilderAgent.ts](../src/utils/aiItineraryBuilderAgent.ts)

### Configuration

| Setting          | Value   | Description                                    |
| ---------------- | ------- | ---------------------------------------------- |
| Model            | `gpt-4o`| OpenAI model used                              |
| Temperature      | `0.1`   | Low temperature for consistent outputs         |
| Max Iterations   | `20`    | Maximum tool-calling rounds before timeout     |

### Agent Loop

```typescript
while (iterations < maxIterations) {
  // 1. Send conversation to OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools: itineraryAgentTools,
    temperature: 0.1,
  });

  // 2. Check for tool calls
  if (!toolCalls || toolCalls.length === 0) {
    // No more tools → agent is done → run post-processing
    return itinerary;
  }

  // 3. Execute each tool call
  for (const toolCall of toolCalls) {
    const result = executeToolCall(toolCall);
    messages.push({ role: "tool", content: result });
  }
}
```

### System Prompt

The agent receives a system message establishing its role:

```
You are a travel itinerary planning assistant. Use the provided tools
to create optimized itineraries.
```

### User Prompt Structure

The initial user prompt includes:

1. **Trip Details**: Destination, dates, duration
2. **Available Activities**: Full list with IDs, names, locations, coordinates, durations, preferred times, descriptions, and tags
3. **Planning Instructions**: Detailed guidance on:
   - Grouping activities by location/region
   - Optimizing within-city sequencing by walking distance
   - Checking travel times between activities
   - Prioritizing walking when reasonable (<30 min)
   - Adding travel segments for distant locations
   - Time slot definitions (morning: 7am-12pm, afternoon: 12pm-5pm, evening: 5pm-10pm)
   - Example multi-city flow

### Logging

The agent accepts an optional `logger` function for debugging:

```typescript
const itinerary = await aiItineraryBuilderAgent(
  { trip, tripIdeas },
  (msg) => console.log(msg)  // Optional logger
);
```

Log messages include:
- Iteration counts
- Tool calls with arguments
- Tool results
- LLM responses
- Post-processing actions

---

## Available Tools

The AI agent has access to 5 tools defined in [itineraryAgentTools.ts](../src/tools/itineraryAgentTools.ts).

### 1. get_all_travel_times

**Purpose**: Compare travel times between two activities across all transportation modes.

**When to Use**: Before scheduling consecutive activities to understand logistics.

**Parameters**:

| Name                 | Type   | Required | Description                              |
| -------------------- | ------ | -------- | ---------------------------------------- |
| `from_activity_id`   | string | Yes      | Starting activity ID                     |
| `to_activity_id`     | string | Yes      | Destination activity ID                  |
| `available_minutes`  | number | No       | Max time available for travel            |

**Returns**:

```json
{
  "success": true,
  "data": {
    "from": { "id": "...", "name": "Eiffel Tower", "location": "Paris, France" },
    "to": { "id": "...", "name": "Louvre Museum", "location": "Paris, France" },
    "bestMode": { "mode": "walking", "minutes": 25 },
    "allModes": [
      { "mode": "walking", "minutes": 25 },
      { "mode": "transit", "minutes": 15 },
      { "mode": "driving", "minutes": 10 }
    ],
    "requiresMultipleSlots": false,
    "estimatedSlots": 1
  }
}
```

**Implementation**: Uses [findBestTravelMode.ts](../src/utils/findBestTravelMode.ts)

---

### 2. add_travel_segment

**Purpose**: Add an explicit "Travel to [destination]" activity to the itinerary.

**When to Use**: When activities are in different cities requiring significant travel.

**Parameters**:

| Name                    | Type     | Required | Description                           |
| ----------------------- | -------- | -------- | ------------------------------------- |
| `destination_name`      | string   | Yes      | City/area name (e.g., "Nice")         |
| `destination_location`  | string   | Yes      | Full location (e.g., "Nice, France")  |
| `travel_mode`           | string   | Yes      | `walking`, `transit`, or `driving`    |
| `duration_minutes`      | number   | Yes      | Total travel time                     |
| `day_number`            | number   | Yes      | Day to add segment to                 |
| `time_slots`            | string[] | Yes      | Slots used (e.g., `["morning", "afternoon"]`) |

**Returns**:

```json
{
  "success": true,
  "message": "Added travel segment to Nice on day 2 (morning-afternoon)",
  "segment": {
    "id": "travel-2-1704067200000",
    "type": "travel",
    "name": "Travel to Nice",
    "location": "Nice, France",
    "travel_mode": "transit",
    "duration_minutes": 300,
    "time_of_day": "morning-afternoon"
  }
}
```

**Implementation**: [addTravelSegment.ts](../src/utils/addTravelSegment.ts)

---

### 3. assign_activity_to_day

**Purpose**: Schedule a specific activity to a day and time slot.

**When to Use**: To place activities into the itinerary.

**Parameters**:

| Name          | Type   | Required | Description                           |
| ------------- | ------ | -------- | ------------------------------------- |
| `activity_id` | string | Yes      | ID of activity to assign              |
| `day_number`  | number | Yes      | Day number (1-based)                  |
| `time_of_day` | string | Yes      | `morning`, `afternoon`, or `evening`  |

**Returns**:

```json
{
  "success": true,
  "message": "Assigned activity abc123 to day 1 (morning)"
}
```

**Behavior**:
- Removes activity from `activities_pool`
- Adds activity to the specified day's `activities` array
- Fails if activity not found in pool or day doesn't exist

**Implementation**: [assignActivityToDay.ts](../src/utils/assignActivityToDay.ts)

---

### 4. check_day_conflicts

**Purpose**: Validate that activities in a day don't have scheduling conflicts.

**When to Use**: Before finalizing day assignments.

**Parameters**:

| Name         | Type   | Required | Description                           |
| ------------ | ------ | -------- | ------------------------------------- |
| `day_number` | number | Yes      | Day to check                          |
| `activities` | array  | Yes      | Array of `{ activity_id, time_of_day }` |

**Returns**:

```json
{
  "success": true,
  "data": {
    "hasConflicts": true,
    "conflicts": [
      {
        "type": "duration_exceeded",
        "activities": [...],
        "time_of_day": "morning",
        "description": "Total duration in morning exceeds 300 minutes"
      }
    ]
  }
}
```

**Conflict Types**:

| Type                 | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `duration_exceeded`  | Total activity duration exceeds 5-hour slot limit    |
| `travel_time_issue`  | Activity + travel time exceeds slot before next one  |

**Implementation**: [checkDayConflicts.ts](../src/utils/checkDayConflicts.ts)

---

### 5. get_activity_details

**Purpose**: Retrieve detailed information about a specific activity.

**When to Use**: When the agent needs more context before placement decisions.

**Parameters**:

| Name          | Type   | Required | Description          |
| ------------- | ------ | -------- | -------------------- |
| `activity_id` | string | Yes      | Activity ID to fetch |

**Returns**:

```json
{
  "success": true,
  "data": {
    "name": "Eiffel Tower Visit",
    "location": {
      "lat": 48.8584,
      "lng": 2.2945,
      "address": "Champ de Mars, Paris"
    },
    "duration_minutes": 120,
    "description": "Iconic iron lattice tower...",
    "tags": ["landmark", "views", "photography"]
  }
}
```

**Implementation**: [getActivityDetails.ts](../src/utils/getActivityDetails.ts)

---

## Utility Functions

### assignActivityToDay.ts

**Purpose**: Core function for moving activities from the pool to scheduled days.

**Key Logic**:
1. Find activity in `activities_pool` by ID
2. Find target day by `day_number`
3. Remove from pool, add to day with `time_of_day` property

**Interfaces Exported**:
- `IAssignActivityArgs`: Input parameters
- `IItineraryDay`: Day structure
- `IItinerary`: Full itinerary structure

---

### addTravelSegment.ts

**Purpose**: Creates travel activities that represent inter-city travel.

**Key Features**:
- Generates unique IDs (`travel-{day}-{timestamp}`)
- Formats time slots (single or combined like `morning-afternoon`)
- Converts travel mode to display format (`transit` → `train/transit`)
- Formats duration display (`300` → `5h`)

**Interfaces Exported**:
- `IAddTravelSegmentArgs`: Input parameters
- `ITravelSegment`: Travel activity structure

---

### checkDayConflicts.ts

**Purpose**: Validates a day's schedule for conflicts.

**Constants**:
- `SLOT_LIMIT_MINUTES = 300` (5 hours per slot)

**Checks Performed**:
1. Total duration per time slot doesn't exceed limit
2. Activity duration + travel time to next activity fits in slot

**Interfaces Exported**:
- `IConflict`: Conflict details
- `ICheckDayConflictsResult`: Validation result

---

### createOpenSlot.ts

**Purpose**: Adds "Free Time" activities to fill empty slots.

**Output Activity**:
```json
{
  "id": "open-slot-1-morning-1704067200000",
  "type": "open_slot",
  "title": "Free Time",
  "time_of_day": "morning",
  "duration_minutes": 180,
  "description": "3h of free time for relaxation or spontaneous exploration"
}
```

**Interface Exported**: `IOpenSlot`

---

### findBestTravelMode.ts

**Purpose**: Tests all travel modes and recommends the best option.

**Mode Priority**: `walking` → `transit` → `driving`

**Logic**:
1. Test all modes in parallel via Google Maps API
2. If time constraint provided, find first mode that fits
3. If no constraint, prefer walking if ≤30 min, else fastest
4. Calculate if travel requires multiple time slots (>3 hours)

**Constants**:
- `SLOT_DURATION_MINUTES = 180` (3 hours)

**Interfaces Exported**:
- `TravelModeResult`: Single mode result
- `FindBestTravelModeResult`: All modes with recommendation

---

### getActivityDetails.ts

**Purpose**: Formats activity data for tool responses.

**Default Values**:
- `duration_minutes`: 60 if not specified
- `lat/lng`: 0 if coordinates missing

**Interface Exported**: `IGetActivityDetailsResult`

---

### getDurationMinutes.ts

**Purpose**: Normalizes duration from various formats to minutes.

**Supported Formats**:
- String with "hour": `"2 hours"` → `120`
- Number: `90` → `90`
- Default: `0`

---

### travelTimeBetweenActivities.ts

**Purpose**: Calls Google Maps Distance Matrix API for travel times.

**API Endpoint**: `https://maps.googleapis.com/maps/api/distancematrix/json`

**Parameters**:
- `origins`: Starting coordinates
- `destinations`: Ending coordinates
- `mode`: `driving`, `walking`, or `transit`

**Returns**:
- Success: `{ minutes: number }`
- Error: `{ error: string }`

**Type Exported**: `TravelMode`

**Interface Exported**: `IActivityLocation`

---

## Data Structures

### IItinerary

The main itinerary structure built by the agent.

```typescript
interface IItinerary {
  trip_id: string;           // UUID of the trip
  trip_title: string;        // Trip title or destination
  destination: string;       // Main destination
  start_date: string;        // ISO date string
  end_date: string;          // ISO date string
  days: IItineraryDay[];     // Array of days
  activities_pool: any[];    // Unassigned activities
}
```

### IItineraryDay

Structure for each day in the itinerary.

```typescript
interface IItineraryDay {
  date: string;              // ISO date (YYYY-MM-DD)
  day_number: number;        // 1-based day number
  activities: any[];         // Scheduled activities
}
```

### ITravelSegment

Represents travel between locations.

```typescript
interface ITravelSegment {
  id: string;                          // Unique ID
  type: "travel";                      // Activity type
  name: string;                        // "Travel to [destination]"
  location: string;                    // Full destination location
  destination_name: string;            // City/area name
  destination_location: string;        // Full location string
  travel_mode: TravelMode;             // walking/transit/driving
  duration_minutes: number;            // Travel time
  time_of_day: string;                 // Slot(s) used
}
```

### IActivity

Base activity structure from the database.

```typescript
interface IActivity {
  id: string;
  name: string;
  description?: string;
  location?: IActivityLocation;
  latitude?: number;
  longitude?: number;
  duration_minutes?: number;
  duration?: number | string;
  time_of_day?: "morning" | "afternoon" | "evening";
  tags?: string[];
  travel_mode?: "driving" | "walking" | "transit";
}
```

### IOpenSlot

Free time slot structure.

```typescript
interface IOpenSlot {
  id: string;                          // Unique ID
  type: "open_slot";                   // Activity type
  title: "Free Time";                  // Display title
  time_of_day: "morning" | "afternoon" | "evening";
  duration_minutes: number;            // Slot duration
}
```

---

## Voting & Filtering System

### Overview

Before the AI agent processes activities, they go through a voting-based selection system that ensures the itinerary reflects group preferences.

**Code Reference**: [itinerary.controller.ts](../src/controllers/itinerary.controller.ts) (lines 38-116)

### Reaction Types

Members can vote on each activity idea with one of four signals:

| Signal | Meaning                     | Priority |
| ------ | --------------------------- | -------- |
| `fire` | Must do! High enthusiasm    | Highest  |
| `down` | Interested, would do it     | High     |
| `meh`  | Neutral, don't care either way | Low   |
| `skip` | Prefer not to do this       | Exclude  |

### Aggregation

Reactions are aggregated per activity:

```typescript
const reactionCounts: Record<string, { fire, down, meh, skip }> = {};

for (const reaction of reactions) {
  switch (reaction.signal) {
    case "fire": reactionCounts[idea_id].fire++; break;
    case "down": reactionCounts[idea_id].down++; break;
    case "meh":  reactionCounts[idea_id].meh++;  break;
    case "skip": reactionCounts[idea_id].skip++; break;
  }
}
```

### Filtering Algorithm

Activities must meet **both** criteria to be included:

1. **Has positive support**: At least one `fire` or `down` vote
2. **More positive than negative**: `(fire + down) > (meh + skip)`

```typescript
const filteredIdeas = tripIdeas.filter((idea) => {
  const positiveVotes = counts.fire + counts.down;
  const negativeVotes = counts.meh + counts.skip;
  const hasPositiveSupport = positiveVotes > 0;
  const isMorePositiveThanNegative = positiveVotes > negativeVotes;

  return hasPositiveSupport && isMorePositiveThanNegative;
});
```

### Ranking Algorithm

Remaining activities are sorted by popularity:

1. **Primary**: `fire` votes (descending)
2. **Secondary**: `down` votes (descending)

```typescript
filteredIdeas.sort((ideaA, ideaB) => {
  if (countsB.fire !== countsA.fire) return countsB.fire - countsA.fire;
  return countsB.down - countsA.down;
});
```

### Example

Given 3 trip members voting on 4 activities:

| Activity        | Fire | Down | Meh | Skip | Positive | Negative | Included? | Rank |
| --------------- | ---- | ---- | --- | ---- | -------- | -------- | --------- | ---- |
| Eiffel Tower    | 3    | 0    | 0   | 0    | 3        | 0        | Yes       | 1    |
| Louvre Museum   | 1    | 2    | 0   | 0    | 3        | 0        | Yes       | 2    |
| Random Café     | 0    | 1    | 2   | 0    | 1        | 2        | No        | -    |
| Tourist Trap    | 0    | 0    | 0   | 3    | 0        | 3        | No        | -    |

---

## Post-Processing

After the AI agent finishes building the itinerary, post-processing fills empty time slots.

**Code Reference**: [aiItineraryBuilderAgent.ts](../src/utils/aiItineraryBuilderAgent.ts) (lines 166-218)

### Empty Slot Detection

For each day, check all three time slots:

```typescript
const timeSlots = ["morning", "afternoon", "evening"];

for (const day of itinerary.days) {
  for (const slot of timeSlots) {
    const hasActivity = day.activities.some((a) => {
      if (a.time_of_day === slot) return true;
      if (a.time_of_day.includes(slot)) return true;  // Multi-slot activities
      return false;
    });

    if (!hasActivity) {
      createOpenSlot(day, slot, 180);  // 3 hours of free time
    }
  }
}
```

### Unassigned Activities

Activities that couldn't be scheduled remain in `activities_pool` and are returned as `unassigned_activities`:

```typescript
return {
  ...itinerary,
  unassigned_activities: itinerary.activities_pool,
};
```

This allows the client to display which activities didn't fit the schedule.

---

## Configuration & Dependencies

### Environment Variables

| Variable                      | Description                      | Required |
| ----------------------------- | -------------------------------- | -------- |
| `OPENAI_API_KEY`              | OpenAI API key for GPT-4o        | Yes      |
| `GOOGLE_MAPS_PLATFORM_API_KEY`| Google Maps API key              | Yes      |
| `SUPABASE_URL`                | Supabase project URL             | Yes      |
| `SUPABASE_ANON_KEY`           | Supabase anonymous/public key    | Yes      |
| `PORT`                        | Server port (default varies)     | No       |

### External APIs

| API                          | Purpose                               | Endpoint |
| ---------------------------- | ------------------------------------- | -------- |
| OpenAI Chat Completions      | AI agent reasoning & tool calling     | `api.openai.com` |
| Google Distance Matrix       | Travel time calculations              | `maps.googleapis.com` |
| Supabase                     | Database & authentication             | `<project>.supabase.co` |

### Database Tables

| Table                       | Purpose                                |
| --------------------------- | -------------------------------------- |
| `trips`                     | Trip metadata (dates, destination)     |
| `trip_reel_ideas`           | Activity ideas with enrichment data    |
| `trip_reel_idea_reactions`  | Member votes on ideas                  |
| `trip_itineraries`          | Generated itineraries (JSONB)          |

### Database Schemas

#### trips

Stores metadata for each trip.

```sql
create table public.trips (
  id uuid not null default gen_random_uuid (),
  title text null,
  destination text not null,
  destination_lat numeric null,
  destination_lng numeric null,
  start_date timestamp with time zone null,
  end_date timestamp with time zone null,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint trips_pkey primary key (id),
  constraint trips_created_by_fkey foreign key (created_by) references member_profiles (id)
) tablespace pg_default;
```

**Key columns for itinerary generation:**
- `id` - Used as path parameter in API
- `destination` - Passed to AI agent for context
- `start_date`, `end_date` - Determines number of days in itinerary

---

#### trip_reel_ideas

Stores all activity ideas for a trip, enriched with location and metadata from TikTok/YouTube videos.

```sql
create table public.trip_reel_ideas (
  id uuid not null default gen_random_uuid (),
  trip_id uuid not null,
  source_url text not null,
  source_platform text not null,
  source_video_id text not null,
  source_canonical_url text null,
  comment text null,
  title text null,
  summary text null,
  tags text[] null default '{}'::text[],
  category text null,
  cost_bucket text null,
  duration_bucket text null,
  time_of_day text null,
  icon_type text null,
  location jsonb null,
  place jsonb null,
  created_by uuid not null,
  enrichment_status text not null default 'CREATED'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  latitude numeric null,
  longitude numeric null,
  constraint trip_reel_ideas_pkey primary key (id),
  constraint trip_reel_ideas_trip_id_source_platform_source_video_id_key unique (trip_id, source_platform, source_video_id),
  constraint trip_reel_ideas_trip_id_fkey foreign key (trip_id) references trips (id) on delete cascade,
  constraint trip_reel_ideas_created_by_fkey foreign key (created_by) references member_profiles (id),
  constraint trip_reel_ideas_enrichment_status_check check (
    (enrichment_status = any (array['CREATED'::text, 'UNFURLED'::text, 'SUMMARIZED'::text, 'ENRICHED'::text, 'DONE'::text]))
  ),
  constraint trip_reel_ideas_cost_bucket_check check (
    (cost_bucket = any (array['$'::text, '$$'::text, '$$$'::text]))
  ),
  constraint trip_reel_ideas_source_platform_check check (
    (source_platform = any (array['tiktok'::text, 'youtube'::text]))
  ),
  constraint trip_reel_ideas_time_of_day_check check (
    (time_of_day = any (array['morning'::text, 'afternoon'::text, 'evening'::text]))
  ),
  constraint trip_reel_ideas_category_check check (
    (category = any (array['food'::text, 'sightseeing'::text, 'nature'::text, 'shopping'::text, 'nightlife'::text, 'activity'::text, 'stay'::text, 'other'::text]))
  ),
  constraint trip_reel_ideas_duration_bucket_check check (
    (duration_bucket = any (array['30m'::text, '1-2h'::text, 'half-day'::text]))
  )
) tablespace pg_default;

create index if not exists idx_trip_reel_ideas_lat_lng on public.trip_reel_ideas using btree (latitude, longitude) tablespace pg_default;
```

**Key columns for itinerary generation:**
- `id` - Used by AI tools to reference activities
- `trip_id` - Links ideas to the trip being planned
- `title`, `summary` - Passed to AI for scheduling decisions
- `latitude`, `longitude` - Required for travel time calculations
- `time_of_day` - Preferred scheduling slot (hint for AI)
- `duration_bucket` - Activity duration (`30m`, `1-2h`, `half-day`)
- `enrichment_status` - Must be `'finished'` to be included
- `source_platform` - Where the idea came from (`tiktok` or `youtube`)
- `category` - Activity type for AI context
- `cost_bucket` - Price level (`$`, `$$`, `$$$`)

---

#### trip_reel_idea_reactions

Stores member reactions (votes) for trip ideas.

```sql
create table public.trip_reel_idea_reactions (
  id uuid not null default gen_random_uuid (),
  idea_id uuid not null,
  member_id uuid not null,
  member_name text null,
  signal text not null,
  comment text null,
  created_at timestamp with time zone not null default now(),
  constraint trip_reel_idea_reactions_pkey primary key (id),
  constraint trip_reel_idea_reactions_idea_id_member_id_key unique (idea_id, member_id),
  constraint trip_reel_idea_reactions_idea_id_fkey foreign key (idea_id) references trip_reel_ideas (id) on delete cascade,
  constraint trip_reel_idea_reactions_member_id_fkey foreign key (member_id) references member_profiles (id),
  constraint trip_reel_idea_reactions_signal_check check (
    (signal = any (array['fire'::text, 'down'::text, 'meh'::text, 'skip'::text]))
  )
) tablespace pg_default;
```

**Key columns for itinerary generation:**
- `idea_id` - Links reaction to specific activity idea
- `signal` - The vote type (`fire`, `down`, `meh`, `skip`) used for filtering/ranking
- `UNIQUE(idea_id, member_id)` - Ensures each member votes once per idea

---

#### trip_itineraries

Stores the generated itinerary for a trip.

```sql
create table public.trip_itineraries (
  id uuid not null default gen_random_uuid(),
  trip_id uuid null,
  itinerary jsonb null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null default now(),
  constraint trip_itineraries_pkey primary key (id),
  constraint trip_itineraries_trip_id_fkey foreign key (trip_id) references trips (id)
);
```

**Key columns:**
- `trip_id` - Links itinerary to trip (upsert key)
- `itinerary` - JSONB column containing the full `IItinerary` structure

**Example itinerary JSONB structure:**
```json
{
  "trip_id": "uuid",
  "trip_title": "Paris Adventure",
  "destination": "Paris, France",
  "start_date": "2026-02-01",
  "end_date": "2026-02-03",
  "days": [
    {
      "date": "2026-02-01",
      "day_number": 1,
      "activities": [
        {
          "id": "activity-uuid",
          "title": "Eiffel Tower",
          "time_of_day": "morning",
          "latitude": 48.8584,
          "longitude": 2.2945
        }
      ]
    }
  ],
  "unassigned_activities": []
}
```

---

### PNPM Dependencies

```json
{
  "openai": "^4.x",
  "express": "^4.x",
  "@supabase/supabase-js": "^2.x"
}
```

---

## Testing & Verification

### Quick Test: Using the Test Function

The easiest way to test the AI itinerary builder is using the built-in test function:

**Code Reference**: [aiItineraryBuilderTestFunction.ts](../src/utils/aiItineraryBuilderTestFunction.ts)

```bash
# From the server directory
pnpm tsx src/utils/aiItineraryBuilderTestFunction.ts
```

This test function:
- Uses mock data for a 5-day trip through Southern France (Paris → Lyon → Marseille)
- Tests 10 activities across 3 city clusters
- Validates key scenarios:
  1. **Within-city optimization**: Activities should be grouped by city, never bouncing between cities in one day
  2. **Walking priority**: Nearby activities grouped without travel segments
  3. **Travel segments**: Should add "Travel to Lyon" and "Travel to Marseille" for inter-city travel
  4. **Time conflicts**: Handles two morning activities in Paris (Eiffel Tower + Trocadéro)
  5. **Optimal ordering**: Should figure out best walking sequence (Trocadéro→Eiffel→Champs→Louvre)

**Test Output Includes**:
- City cluster overview with Google Maps links for each activity
- AI agent execution log showing all tool calls
- Formatted itinerary with activities organized by day
- List of any unassigned activities

---

### API Testing: Prerequisites

For testing the actual API endpoint:

1. Valid trip with `start_date` and `end_date`
2. At least one enriched idea (`enrichment_status = 'finished'`)
3. At least one positive vote on that idea (`fire` or `down`)
4. Valid authentication token

### API Testing: Call the Endpoint

```bash
curl -X POST http://localhost:3000/itinerary/<trip_uuid> \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json"
```

**Success Response**:
```json
{
  "success": true,
  "tripId": "<trip_uuid>",
  "activitiesCount": 12
}
```

**Verify in Database**:
```sql
SELECT itinerary FROM trip_itineraries WHERE trip_id = '<trip_uuid>';
```

---

### Expected Behaviors

| Scenario                           | Expected Result                          |
| ---------------------------------- | ---------------------------------------- |
| Valid trip with voted ideas        | 200 with generated itinerary             |
| Trip without dates                 | 400 "Trip must have both start_date..."  |
| All ideas negatively voted         | 400 "No suitable ideas found..."         |
| No enriched ideas                  | 400 "No suitable ideas found..."         |
| Invalid/expired token              | 401 "Invalid or expired token"           |
| Non-existent trip ID               | 404 with Supabase error                  |

### Debugging Tips

1. **Enable logging**: Pass a logger function to `aiItineraryBuilderAgent`
2. **Check iteration count**: If hitting max iterations, the prompt may be too complex
3. **Verify coordinates**: Travel time calculations require valid lat/lng
4. **Monitor API costs**: Each iteration makes OpenAI + potentially multiple Google Maps calls

---

## File References

| File | Purpose |
| ---- | ------- |
| [app.ts](../src/app.ts) | Express server entry point |
| [itinerary.routes.ts](../src/routes/itinerary.routes.ts) | Route definitions |
| [itinerary.controller.ts](../src/controllers/itinerary.controller.ts) | Request handling & filtering |
| [requireAuth.ts](../src/middleware/requireAuth.ts) | JWT authentication |
| [aiItineraryBuilderAgent.ts](../src/utils/aiItineraryBuilderAgent.ts) | Core AI agent |
| [aiItineraryBuilderTestFunction.ts](../src/utils/aiItineraryBuilderTestFunction.ts) | Test function with mock data |
| [itineraryAgentTools.ts](../src/tools/itineraryAgentTools.ts) | Tool definitions |
| [assignActivityToDay.ts](../src/utils/assignActivityToDay.ts) | Activity scheduling |
| [addTravelSegment.ts](../src/utils/addTravelSegment.ts) | Travel segment creation |
| [checkDayConflicts.ts](../src/utils/checkDayConflicts.ts) | Conflict detection |
| [createOpenSlot.ts](../src/utils/createOpenSlot.ts) | Free time slots |
| [findBestTravelMode.ts](../src/utils/findBestTravelMode.ts) | Travel mode optimization |
| [getActivityDetails.ts](../src/utils/getActivityDetails.ts) | Activity detail formatting |
| [getDurationMinutes.ts](../src/utils/getDurationMinutes.ts) | Duration normalization |
| [travelTimeBetweenActivities.ts](../src/utils/travelTimeBetweenActivities.ts) | Google Maps integration |
| [interface.ts](../src/types/interface.ts) | TypeScript interfaces |

---

_Last updated: January 2026_
