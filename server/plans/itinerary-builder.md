# Vacation Itinerary Generation - PRD

## Feature Overview

Generate an automated vacation itinerary from a user's curated travel reel ideas. The system will:

- Fetch a trip and all associated reel ideas
- Filter and prioritize ideas by preference (fire > down)
- Enrich with Google Places API data
- Calculate travel times between activities using Google Maps API
- Intelligently assign activities to days (spread evenly, no conflicts)
- Return a structured JSON itinerary
- Save the itinerary to the database

---

## Database Schema

### New Table: `trip_itineraries`

```sql
CREATE TABLE trip_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  itinerary_data JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(trip_id) -- One itinerary per trip
);
```

**Fields:**

- `id` - Unique identifier
- `trip_id` - Foreign key to trips table
- `itinerary_data` - Complete itinerary structure (all days/activities)
- `created_by` - User ID who generated the itinerary
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Existing Tables Used

- `trips` - Trip details (id, title, destination, destination_lat, destination_lng, start_date, end_date)
- `trip_reel_ideas` - Reel ideas (id, trip_id, title, summary, location, place, time_of_day, duration_bucket, cost_bucket, category, tags, etc.)

---

## API Endpoint

### Generate Itinerary

**Endpoint:** `POST /itinerary/:tripId`

**Authentication:** Required (JWT token via requireAuth middleware)

**Path Parameters:**

- `tripId` (UUID) - ID of the trip

**Response (200 OK):**

```json
{
  "trip_id": "uuid",
  "trip_title": "San Francisco Adventure",
  "destination": "San Francisco, CA",
  "start_date": "2026-06-01",
  "end_date": "2026-06-03",
  "days": [
    {
      "date": "2026-06-01",
      "day_number": 1,
      "activities": [
        {
          "id": 1,
          "title": "Sunrise Hike at Mount Tam",
          "time_of_day": "morning",
          "duration": "2 hours",
          "location": {
            "latitude": 37.9235,
            "longitude": -122.5965
          },
          "place_id": "ChIJVXealLU_xkcRja_At0z9AGY",
          "preference": "fire",
          "travel_mode": "drive",
          "travel_time_from_previous_minutes": null
        },
        {
          "id": 2,
          "title": "Golden Gate Bridge Walk",
          "time_of_day": "afternoon",
          "duration": "1.5 hours",
          "location": {
            "latitude": 37.8199,
            "longitude": -122.4783
          },
          "place_id": "ChIJiQHsW0mAhYARmB6e5p2l8gM",
          "preference": "fire",
          "travel_mode": "drive",
          "travel_time_from_previous_minutes": 35
        },
        {
          "type": "open_slot",
          "time_of_day": "evening",
          "duration": "3 hours",
          "note": "Free time or add your own activity"
        }
      ]
    },
    {
      "date": "2026-06-02",
      "day_number": 2,
      "activities": [...]
    }
  ]
}
```

**Error Responses:**

- `404` - Trip not found
- `401` - Unauthorized (invalid/missing token)
- `500` - Server error (Google API failure, database error, etc.)

---

## Implementation Steps

### Step 1: Add API Configuration

- Add `GOOGLE_PLACES_API_KEY` and `GOOGLE_MAPS_API_KEY` to `.env`
- Add `OPENAI_API_KEY` to `.env`
- Initialize all in `src/config.ts`

### Step 2: Define TypeScript Types

- Create interfaces in `src/types/interface.ts`:
  - `ITrip`
  - `ITripReelIdea`
  - `IItinerary`
  - `IDay`
  - `IActivity`
  - `IOpenSlot`
  - `ITravelMode` (enum: drive, walk, transit)

### Step 3: Create Database Query Function

- Create `src/controllers/itinerary.controller.ts`
- Add function to fetch trip + all associated ideas from Supabase
- Filter out unfinished ideas (enrichment_status != 'finished')

### Step 4: Filter & Prioritize Ideas

- Separate ideas into `fire` and `down` lists
- Remove `meh` and `skip` ideas
- Create ranked list: all `fire` first, then `down`

### Step 5: Enrich with Google Places Data

- For each idea, call Google Places API using `place_id`
- Extract: address, opening hours, place details
- Handle null `place_id` gracefully

### Step 6: Calculate Travel Times

- Build travel matrix for all activity pairs
- Call Google Maps Distance Matrix API
- Get times for drive, walk, transit modes
- Select fastest reasonable mode

### Step 7: Build Day Assignment Algorithm with OpenAI Function Calling

- Define tools for OpenAI to call:
  - `filter_activities_by_time(time_of_day, activities)` - Filter activities for a specific time window
  - `calculate_travel_time(from_location, to_location, modes)` - Get travel times between two locations
  - `assign_activity_to_day(activity_id, day_number, time_slot)` - Assign activity to a specific day/time
  - `validate_day_assignment(day_number)` - Check for conflicts on a given day
  - `get_day_availability(day_number)` - Get remaining time slots for a day
- Send prioritized activities + trip details + travel matrix to OpenAI with these tools
- Let the model orchestrate the assignment by calling tools in sequence
- Model builds the itinerary by calling tools as it works through each activity
- Validate final itinerary against all constraints

### Step 8: Fill Gaps with Open Slots

- Identify time gaps in each day
- Insert open_slot activities with duration

### Step 9: Save to Database & Return

- Save itinerary_data to trip_itineraries table
- Overwrite if itinerary already exists for this trip
- Return 200 with itinerary JSON

---

## Constants & Configuration

### Time Windows

- **Morning:** 8:00 AM - 12:00 PM (240 minutes)
- **Afternoon:** 12:00 PM - 5:00 PM (300 minutes)
- **Evening:** 5:00 PM - 10:00 PM (300 minutes)

### Day Operating Hours

- Daily active window: 8:00 AM - 10:00 PM (14 hours = 840 minutes)

### Travel Time Thresholds

- Auto-separate if travel time > 180 minutes (3 hours)
- Exclude walking if travel time > 120 minutes (2 hours)

### Preference Levels

- `fire` - Must include, highest priority
- `down` - Include if space available
- `meh` - Skip
- `skip` - Skip
