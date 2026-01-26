# During Trip Agents

A real-time AI-powered travel companion system that reduces decision fatigue during active trips by providing contextual suggestions for activities, food, and navigation.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [API Reference](#api-reference)
4. [Frontend Integration Guide](#frontend-integration-guide)
5. [Data Structures](#data-structures)
6. [Geolocation Handling](#geolocation-handling)
7. [Error Handling](#error-handling)
8. [Activity Status Management](#activity-status-management)
9. [Conflict Resolution](#conflict-resolution)
10. [Rate Limiting](#rate-limiting)
11. [Caching Strategy](#caching-strategy)
12. [Configuration & Dependencies](#configuration--dependencies)
13. [Testing & Verification](#testing--verification)

---

## Executive Summary

### What It Does

The During Trip Agents system provides real-time contextual assistance during active trips:

- **"What Now?" Decisions**: AI-powered suggestions for what to do next based on location, time, weather, and preferences
- **Food Recommendations**: Context-aware restaurant and cafe suggestions matching dietary preferences
- **Map Intelligence**: Smart map annotations showing scheduled activities and nearby POIs
- **Activity Tracking**: Mark activities as in-progress, completed, or skipped
- **Spontaneous Additions**: Accept suggestions and add them to the itinerary with conflict detection

### Key Benefits

- **Reduces Decision Fatigue**: 3-5 curated options instead of overwhelming lists
- **Context-Aware**: Considers time of day, weather, energy level, and schedule
- **Non-Intrusive**: Suggestions on-demand, not pushy notifications
- **Flexible**: Easy to deviate from planned itinerary

### Core Promise

> Calm, contextual help exactly when it's needed — and silence when it's not.

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Frontend Application                              │
│  ├── Location permission & browser geolocation                          │
│  ├── "Decide for me" / "Find food" buttons                              │
│  └── Map with activity markers                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    POST /during-trip/* with location
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Express Server                                   │
│  ├── requireAuth (JWT validation)                                       │
│  ├── requireTripAccess (ownership/membership check)                     │
│  ├── rateLimitDuringTrip (20 req/day for /decide, /food)               │
│  └── duringTrip.controller.ts                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Context Builder                                    │
│  (contextBuilder.ts)                                                    │
│  ├── Fetch trip data (Supabase)                                         │
│  ├── Fetch user preferences (member_profiles)                           │
│  ├── Get today's activities (trip_itineraries JSONB)                    │
│  ├── Get weather (Open-Meteo API)                                       │
│  └── Build ITripContext object                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │ Decision  │   │ Food      │   │ Map       │
            │ Agent     │   │ Utility   │   │ Utility   │
            │ (OpenAI)  │   │ (Google)  │   │ Function  │
            └───────────┘   └───────────┘   └───────────┘
```

### Data Flow

1. **User Action**: User taps "Decide for me" or "Find food" button
2. **Location Fetch**: Frontend gets browser geolocation (or uses fallback)
3. **API Request**: Frontend sends POST with trip_id and location
4. **Authentication**: JWT validated via Supabase
5. **Authorization**: Trip access verified (owner or member)
6. **Rate Limit Check**: Daily limit checked (20/day for AI endpoints)
7. **Context Building**: Trip, weather, schedule, preferences aggregated
8. **Agent/Utility Execution**: AI agent or utility function runs
9. **Response**: JSON with suggestions returned to frontend

---

## API Reference

### Authentication

All endpoints require a valid Supabase JWT token:

```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

### Base URL

```
Development: http://localhost:5001
Production:  https://trip-weave-jlop.onrender.com
```

---

### 1. Get Trip Context

**Endpoint**: `POST /during-trip/context`

Returns the current trip context including weather, schedule, and user preferences.

**Request Body**:

```json
{
  "trip_id": "uuid-of-trip",
  "location": {
    "lat": 48.8566,
    "lng": 2.3522,
    "accuracy_meters": 10
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trip_id` | string (UUID) | Yes | Trip identifier |
| `location.lat` | number | No | Latitude (-90 to 90) |
| `location.lng` | number | No | Longitude (-180 to 180) |
| `location.accuracy_meters` | number | No | GPS accuracy in meters |

**Success Response (200)**:

```json
{
  "user": {
    "id": "user-uuid",
    "location": {
      "lat": 48.8566,
      "lng": 2.3522,
      "accuracy_meters": 10,
      "is_approximate": false
    },
    "preferences": {
      "travel_style": "balanced",
      "dietary": ["vegetarian"],
      "interests": ["museums", "food"],
      "walking_tolerance": "moderate"
    }
  },
  "trip": {
    "id": "trip-uuid",
    "destination": "Paris, France",
    "destination_lat": 48.8566,
    "destination_lng": 2.3522,
    "day_number": 2,
    "total_days": 5,
    "timezone": "Europe/Paris"
  },
  "temporal": {
    "current_time": "2026-05-02T10:30:00+02:00",
    "time_of_day": "morning",
    "local_timezone": "Europe/Paris"
  },
  "environment": {
    "weather": {
      "condition": "clear",
      "temperature": 18,
      "precipitation": false
    }
  },
  "schedule": {
    "next_activity": {
      "id": "activity-uuid",
      "title": "Visit Eiffel Tower",
      "scheduled_time": "2026-05-02T14:00:00+02:00",
      "time_of_day": "afternoon",
      "location": { "lat": 48.8584, "lng": 2.2945 },
      "duration_minutes": 120
    },
    "time_until_next": 210,
    "today_activities": [...]
  }
}
```

---

### 2. Get Decision Suggestions

**Endpoint**: `POST /during-trip/decide`

**Rate Limited**: Yes (20 requests/day)

Returns 3-5 AI-powered suggestions for what to do next.

**Request Body**:

```json
{
  "trip_id": "uuid-of-trip",
  "location": {
    "lat": 48.8606,
    "lng": 2.3376,
    "accuracy_meters": 15
  }
}
```

**Success Response (200)**:

```json
{
  "options": [
    {
      "id": "louvre-museum",
      "title": "Visit the Louvre Museum",
      "type": "scheduled",
      "distance_km": 0.5,
      "time_required_minutes": 180,
      "energy_level": "medium",
      "reason": "On your itinerary for today, just a 7-minute walk away",
      "coordinates": { "lat": 48.8606, "lng": 2.3376 }
    },
    {
      "id": "nearby-cafe-123",
      "title": "Café de Flore",
      "type": "rest",
      "distance_km": 0.3,
      "time_required_minutes": 45,
      "energy_level": "low",
      "reason": "Highly-rated café nearby, perfect for a morning coffee break",
      "coordinates": { "lat": 48.8540, "lng": 2.3325 }
    },
    {
      "id": "jardin-tuileries",
      "title": "Stroll through Jardin des Tuileries",
      "type": "spontaneous",
      "distance_km": 0.2,
      "time_required_minutes": 60,
      "energy_level": "low",
      "reason": "Beautiful weather today, gardens are right next to the Louvre",
      "coordinates": { "lat": 48.8634, "lng": 2.3275 }
    }
  ],
  "context_summary": "Good morning! It's a sunny 18°C in Paris. You have about 3.5 hours before your Eiffel Tower visit at 2pm.",
  "fallback_used": false,
  "location_approximate": false
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `options` | array | 3-5 activity suggestions |
| `options[].id` | string | Unique identifier for the suggestion |
| `options[].title` | string | Human-readable activity name |
| `options[].type` | string | `"scheduled"` \| `"spontaneous"` \| `"rest"` |
| `options[].distance_km` | number | Distance from user's current location |
| `options[].time_required_minutes` | number | Estimated time needed |
| `options[].energy_level` | string | `"low"` \| `"medium"` \| `"high"` |
| `options[].reason` | string | Why this is suggested |
| `options[].coordinates` | object | `{ lat, lng }` for map display |
| `context_summary` | string | Friendly summary of current context |
| `fallback_used` | boolean | `true` if AI timed out and rules used instead |
| `location_approximate` | boolean | `true` if using trip destination as fallback |

---

### 3. Get Food Recommendations

**Endpoint**: `POST /during-trip/food`

**Rate Limited**: Yes (20 requests/day)

Returns restaurant and cafe recommendations based on time, location, and dietary preferences.

**Request Body**:

```json
{
  "trip_id": "uuid-of-trip",
  "location": {
    "lat": 48.8566,
    "lng": 2.3522
  }
}
```

**Success Response (200)**:

```json
{
  "recommendations": [
    {
      "id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "name": "Le Comptoir du Panthéon",
      "type": "restaurant",
      "cuisine": "French",
      "price_level": 2,
      "distance_km": 0.4,
      "walking_time_minutes": 5,
      "reason": "Highly-rated French restaurant with vegetarian options",
      "coordinates": { "lat": 48.8462, "lng": 2.3464 },
      "dietary_match": true,
      "rating": 4.5,
      "photo_url": "https://maps.googleapis.com/..."
    },
    {
      "id": "ChIJLU7jZClu5kcR4PcOOO6p3I0",
      "name": "Café Kitsuné",
      "type": "cafe",
      "cuisine": "Coffee & Pastries",
      "price_level": 2,
      "distance_km": 0.6,
      "walking_time_minutes": 8,
      "reason": "Trendy café in the Palais Royal gardens",
      "coordinates": { "lat": 48.8636, "lng": 2.3370 },
      "dietary_match": true,
      "rating": 4.3
    }
  ],
  "suggestion_reason": "It's 12:30pm - time for lunch!"
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `recommendations` | array | 3-6 food recommendations |
| `recommendations[].id` | string | Google Place ID |
| `recommendations[].name` | string | Restaurant/cafe name |
| `recommendations[].type` | string | `"restaurant"` \| `"cafe"` \| `"quick_bite"` \| `"park_rest"` |
| `recommendations[].cuisine` | string | Cuisine type |
| `recommendations[].price_level` | number | 1-4 ($ to $$$$) |
| `recommendations[].distance_km` | number | Distance from user |
| `recommendations[].walking_time_minutes` | number | Walking time |
| `recommendations[].reason` | string | Why this is recommended |
| `recommendations[].coordinates` | object | `{ lat, lng }` |
| `recommendations[].dietary_match` | boolean | Matches user's dietary restrictions |
| `recommendations[].rating` | number | Google rating (0-5) |
| `recommendations[].photo_url` | string | Photo URL (optional) |
| `suggestion_reason` | string | Why food is being suggested now |

---

### 4. Get Map Intelligence

**Endpoint**: `POST /during-trip/map-intelligence`

Returns map annotations for scheduled activities and nearby POIs.

**Request Body**:

```json
{
  "trip_id": "uuid-of-trip",
  "location": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "viewport": {
    "ne": { "lat": 48.88, "lng": 2.40 },
    "sw": { "lat": 48.83, "lng": 2.28 }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `viewport` | object | No | Map bounds for filtering annotations |
| `viewport.ne` | object | - | Northeast corner `{ lat, lng }` |
| `viewport.sw` | object | - | Southwest corner `{ lat, lng }` |

**Success Response (200)**:

```json
{
  "annotations": [
    {
      "location": { "lat": 48.8584, "lng": 2.2945 },
      "type": "scheduled",
      "title": "Eiffel Tower",
      "icon": "landmark",
      "priority": 1,
      "snippet": "Today at 2:00 PM • 2 hours",
      "activity_id": "activity-uuid"
    },
    {
      "location": { "lat": 48.8606, "lng": 2.3376 },
      "type": "scheduled",
      "title": "Louvre Museum",
      "icon": "museum",
      "priority": 1,
      "snippet": "Today at 10:00 AM • 3 hours",
      "activity_id": "activity-uuid-2"
    },
    {
      "location": { "lat": 48.8540, "lng": 2.3325 },
      "type": "food",
      "title": "Café de Flore",
      "icon": "cafe",
      "priority": 2,
      "snippet": "4.5★ • $$"
    }
  ],
  "center": { "lat": 48.8566, "lng": 2.3522 },
  "zoom_level": 14
}
```

**Annotation Types**:

| Type | Icon Examples | Priority | Description |
|------|---------------|----------|-------------|
| `scheduled` | landmark, museum, restaurant | 1 (highest) | Activities from itinerary |
| `recommended` | star, sparkle | 2 | AI-suggested places |
| `food` | cafe, restaurant, utensils | 2-3 | Food recommendations |

---

### 5. Update Activity Status

**Endpoint**: `PATCH /during-trip/activity/:activityId/status`

Mark an activity as in-progress, completed, or skipped.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `activityId` | string | Activity ID from itinerary |

**Request Body**:

```json
{
  "trip_id": "uuid-of-trip",
  "status": "completed",
  "notes": "Amazing views from the top!"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trip_id` | string (UUID) | Yes | Trip identifier |
| `status` | string | Yes | `"scheduled"` \| `"in_progress"` \| `"completed"` \| `"skipped"` |
| `location` | object | No | Current location `{ lat, lng }` |
| `notes` | string | No | User notes about the activity |

**Success Response (200)**:

```json
{
  "success": true,
  "activity": {
    "id": "activity-uuid",
    "status": "completed",
    "updated_at": "2026-05-02T16:30:00Z"
  }
}
```

---

### 6. Accept Suggestion

**Endpoint**: `POST /during-trip/suggestions/accept`

Accept a suggestion from `/decide` or `/food` and add it to today's itinerary.

**Request Body**:

```json
{
  "trip_id": "uuid-of-trip",
  "suggestion": {
    "id": "cafe-de-flore",
    "title": "Café de Flore",
    "type": "cafe",
    "coordinates": { "lat": 48.8540, "lng": 2.3325 },
    "cuisine": "French Café",
    "price_level": 2,
    "rating": 4.5
  },
  "time_of_day": "morning",
  "duration_minutes": 60
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trip_id` | string (UUID) | Yes | Trip identifier |
| `suggestion` | object | Yes | The suggestion object from `/decide` or `/food` |
| `suggestion.id` | string | Yes | Suggestion identifier |
| `suggestion.title` | string | Yes | Activity name |
| `suggestion.type` | string | Yes | Activity type |
| `suggestion.coordinates` | object | Yes | `{ lat, lng }` |
| `time_of_day` | string | Yes | `"morning"` \| `"afternoon"` \| `"evening"` |
| `duration_minutes` | number | Yes | Duration (1-1440 minutes) |
| `override_conflicts` | boolean | No | Add even if conflicts exist |
| `remove_conflicting_activity_ids` | array | No | Activity IDs to remove |

**Success Response (200)**:

```json
{
  "success": true,
  "activity": {
    "id": "new-activity-uuid",
    "name": "Café de Flore",
    "time_of_day": "morning",
    "duration_minutes": 60
  },
  "conflicts_detected": false
}
```

**Conflict Response (409)**:

See [Conflict Resolution](#conflict-resolution) section for handling conflicts.

---

## Frontend Integration Guide

### Step 1: Request Location Permission

```typescript
const getLocation = async (): Promise<{
  lat: number;
  lng: number;
  accuracy_meters: number;
} | null> => {
  if (!navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy_meters: position.coords.accuracy,
        });
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      }
    );
  });
};
```

### Step 2: Call the API

```typescript
const getDecisions = async (tripId: string) => {
  const location = await getLocation();

  const response = await fetch("/during-trip/decide", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseSession.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trip_id: tripId,
      location: location || undefined, // Omit if null
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
};
```

### Step 3: Display Results

```tsx
// React example
const DecisionCards = ({ options, contextSummary }) => {
  return (
    <div>
      <p className="context-summary">{contextSummary}</p>

      {options.map((option) => (
        <div key={option.id} className="decision-card">
          <h3>{option.title}</h3>
          <div className="meta">
            <span className={`type-${option.type}`}>
              {option.type === "scheduled" ? "📅" : option.type === "rest" ? "☕" : "✨"}
            </span>
            <span>{option.distance_km.toFixed(1)} km away</span>
            <span>{option.time_required_minutes} min</span>
          </div>
          <p className="reason">{option.reason}</p>
          <button onClick={() => handleAccept(option)}>
            Add to Itinerary
          </button>
        </div>
      ))}
    </div>
  );
};
```

### Step 4: Handle Accepting Suggestions

```typescript
const handleAccept = async (suggestion: IDecisionOption) => {
  try {
    const response = await fetch("/during-trip/suggestions/accept", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trip_id: tripId,
        suggestion: {
          id: suggestion.id,
          title: suggestion.title,
          type: suggestion.type,
          coordinates: suggestion.coordinates,
        },
        time_of_day: getCurrentTimeOfDay(),
        duration_minutes: suggestion.time_required_minutes,
      }),
    });

    if (response.status === 409) {
      // Conflict detected - show resolution UI
      const data = await response.json();
      showConflictModal(data);
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to add activity");
    }

    // Success - refresh itinerary
    refreshItinerary();
  } catch (error) {
    showError(error.message);
  }
};
```

---

## Data Structures

### ITripContext

The main context object returned by `/context` and used internally.

```typescript
interface ITripContext {
  user: {
    id: string;
    location: IUserLocation;
    preferences: IUserPreferences;
  };
  trip: {
    id: string;
    destination: string;
    destination_lat: number;
    destination_lng: number;
    day_number: number;
    total_days: number;
    timezone: string;
  };
  temporal: {
    current_time: string;        // ISO string in trip timezone
    time_of_day: "morning" | "afternoon" | "evening";
    local_timezone: string;
  };
  environment: {
    weather: IWeatherData | null;
  };
  schedule: {
    next_activity?: IScheduledActivity;
    time_until_next?: number;    // minutes
    current_activity?: IScheduledActivity;
    today_activities: IScheduledActivity[];
  };
}
```

### IUserLocation

```typescript
interface IUserLocation {
  lat: number;
  lng: number;
  accuracy_meters?: number;
  is_approximate: boolean;  // true if using trip destination fallback
}
```

### IUserPreferences

```typescript
interface IUserPreferences {
  travel_style: "chill" | "balanced" | "packed";
  dietary: string[];        // e.g., ["vegetarian", "gluten-free"]
  interests: string[];      // e.g., ["museums", "food", "nature"]
  walking_tolerance: string; // "low" | "moderate" | "high"
}
```

### IScheduledActivity

```typescript
interface IScheduledActivity {
  id: string;
  title: string;
  scheduled_time: string;   // ISO string
  time_of_day: "morning" | "afternoon" | "evening";
  location?: { lat: number; lng: number };
  duration_minutes?: number;
}
```

### IDecisionOption

```typescript
interface IDecisionOption {
  id: string;
  title: string;
  type: "scheduled" | "spontaneous" | "rest";
  distance_km: number;
  time_required_minutes: number;
  energy_level: "low" | "medium" | "high";
  reason: string;
  coordinates: { lat: number; lng: number };
}
```

### IFoodRecommendation

```typescript
interface IFoodRecommendation {
  id: string;
  name: string;
  type: "restaurant" | "cafe" | "quick_bite" | "park_rest";
  cuisine?: string;
  price_level: number;      // 1-4
  distance_km: number;
  walking_time_minutes: number;
  reason: string;
  coordinates: { lat: number; lng: number };
  dietary_match: boolean;
  rating?: number;          // 0-5
  photo_url?: string;
}
```

### IMapAnnotation

```typescript
interface IMapAnnotation {
  location: { lat: number; lng: number };
  type: "scheduled" | "recommended" | "food";
  title: string;
  icon: string;             // e.g., "landmark", "cafe", "museum"
  priority: number;         // 1-3 (affects marker size)
  snippet?: string;         // Shows on marker tap
  activity_id?: string;     // Links to itinerary activity
}
```

---

## Geolocation Handling

### Accuracy Thresholds

| Accuracy | Status | Frontend Behavior |
|----------|--------|-------------------|
| < 100m | High | Use as-is, no warning |
| 100m - 500m | Medium | Use with warning indicator |
| > 500m | Poor | Falls back to trip destination |

### Fallback Behavior

If no location is provided or accuracy is poor (>500m), the server uses the trip's destination coordinates:

```json
{
  "location": {
    "lat": 48.8566,
    "lng": 2.3522,
    "is_approximate": true
  }
}
```

**Frontend should**:
1. Show indicator when `location_approximate: true`
2. Suggest user tap "Update Location" button
3. Distances may be less accurate

### Example Fallback UI

```tsx
{response.location_approximate && (
  <div className="location-warning">
    ⚠️ Using approximate location.
    <button onClick={refreshLocation}>Update Location</button>
  </div>
)}
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "details": "Optional technical details"
}
```

### Status Codes

| Status | Error | Cause | Frontend Action |
|--------|-------|-------|-----------------|
| 400 | `"trip_id: Required"` | Missing required field | Show validation error |
| 400 | `"trip_id: must be a valid UUID"` | Invalid UUID format | Fix request |
| 401 | `"No token provided"` | Missing auth header | Redirect to login |
| 401 | `"Invalid or expired token"` | JWT expired | Refresh token or re-login |
| 403 | `"Not authorized for this trip"` | User not owner/member | Show access denied |
| 404 | `"Trip not found"` | Invalid trip_id | Show not found page |
| 404 | `"Itinerary not found"` | No itinerary generated | Prompt to generate |
| 404 | `"Activity not found in itinerary"` | Invalid activity_id | Refresh itinerary |
| 409 | Conflict details | Schedule conflict | Show conflict UI |
| 429 | `"Rate limit exceeded"` | Daily limit hit | Show limit message |
| 500 | `"Failed to get decision suggestions"` | Server error | Retry with backoff |

### Example Error Handling

```typescript
const handleApiError = (status: number, error: any) => {
  switch (status) {
    case 401:
      // Token expired - refresh or redirect
      refreshToken().catch(() => redirectToLogin());
      break;
    case 403:
      showError("You don't have access to this trip");
      break;
    case 404:
      showError(error.error || "Resource not found");
      break;
    case 409:
      // Conflict - show resolution modal
      showConflictModal(error);
      break;
    case 429:
      showError("You've reached today's limit. Try again tomorrow!");
      break;
    default:
      showError("Something went wrong. Please try again.");
  }
};
```

---

## Activity Status Management

### Status State Machine

```
                    ┌─────────────┐
                    │  scheduled  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            │            ▼
      ┌───────────┐        │     ┌──────────┐
      │in_progress│        │     │  skipped │
      └─────┬─────┘        │     └──────────┘
            │              │
            ▼              │
      ┌───────────┐        │
      │ completed │◄───────┘
      └───────────┘
```

### Valid Transitions

| From | To | Allowed |
|------|-----|---------|
| `scheduled` | `in_progress` | ✅ |
| `scheduled` | `completed` | ✅ |
| `scheduled` | `skipped` | ✅ |
| `in_progress` | `completed` | ✅ |
| `in_progress` | `skipped` | ✅ |
| `completed` | Any | ❌ (final state) |
| `skipped` | Any | ❌ (final state) |

### Activity Progress Object

When an activity's status is updated, a `progress` object is added:

```json
{
  "id": "activity-uuid",
  "name": "Visit Eiffel Tower",
  "time_of_day": "afternoon",
  "progress": {
    "status": "completed",
    "started_at": "2026-05-02T14:05:00Z",
    "completed_at": "2026-05-02T16:30:00Z",
    "notes": "Amazing views!"
  }
}
```

---

## Conflict Resolution

### When Conflicts Occur

Conflicts are detected when accepting a suggestion would:
1. Exceed the 5-hour time slot limit
2. Create travel time issues between activities

### Conflict Response (409)

```json
{
  "success": false,
  "activity": {
    "id": "new-activity-uuid",
    "name": "Café de Flore",
    "time_of_day": "morning",
    "duration_minutes": 60
  },
  "conflicts_detected": true,
  "conflicts": [
    {
      "type": "duration_exceeded",
      "time_of_day": "morning",
      "description": "Adding this activity would exceed the 5-hour morning slot limit",
      "conflicting_activities": [
        { "id": "louvre-uuid", "name": "Louvre Museum" },
        { "id": "tuileries-uuid", "name": "Jardin des Tuileries" }
      ]
    }
  ]
}
```

### Conflict Types

| Type | Description |
|------|-------------|
| `duration_exceeded` | Total activities exceed 5-hour slot limit |
| `travel_time_issue` | Travel + activities don't fit in time slot |

### Resolution Options

**Option 1: Override (add anyway)**

```json
{
  "trip_id": "...",
  "suggestion": {...},
  "time_of_day": "morning",
  "duration_minutes": 60,
  "override_conflicts": true
}
```

**Option 2: Remove conflicting activities**

```json
{
  "trip_id": "...",
  "suggestion": {...},
  "time_of_day": "morning",
  "duration_minutes": 60,
  "remove_conflicting_activity_ids": ["louvre-uuid"]
}
```

### Frontend Conflict Modal Example

```tsx
const ConflictModal = ({ conflicts, onOverride, onRemove, onCancel }) => (
  <div className="modal">
    <h2>Schedule Conflict</h2>
    <p>{conflicts[0].description}</p>

    <h3>Conflicting Activities:</h3>
    <ul>
      {conflicts[0].conflicting_activities.map((activity) => (
        <li key={activity.id}>
          <label>
            <input
              type="checkbox"
              onChange={() => toggleRemove(activity.id)}
            />
            {activity.name}
          </label>
        </li>
      ))}
    </ul>

    <div className="actions">
      <button onClick={onOverride}>Add Anyway</button>
      <button onClick={() => onRemove(selectedIds)}>
        Remove Selected & Add
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  </div>
);
```

---

## Rate Limiting

### Limits

| Endpoint | Limit | Scope |
|----------|-------|-------|
| `/during-trip/decide` | 20/day | Per user |
| `/during-trip/food` | 20/day | Per user |
| Other endpoints | No limit | - |

### Rate Limit Response (429)

```json
{
  "error": "Rate limit exceeded",
  "details": "You have exceeded the daily limit of 20 requests. Resets at midnight UTC.",
  "reset_time": "2026-05-03T00:00:00Z"
}
```

### Frontend Handling

```typescript
if (response.status === 429) {
  const data = await response.json();
  const resetTime = new Date(data.reset_time);

  showMessage(
    `Daily limit reached. Try again after ${resetTime.toLocaleTimeString()}`
  );
}
```

### Best Practices

1. **Cache responses**: Store suggestions for a few minutes
2. **Show remaining requests**: If tracking client-side
3. **Debounce**: Don't call on every map pan/zoom
4. **Batch**: Get context + decisions in one flow

---

## Caching Strategy

### Server-Side Cache TTLs

| Data | TTL | Purpose |
|------|-----|---------|
| Trip Context | 5 minutes | Avoid rebuilding on every request |
| Weather | 30 minutes | Weather doesn't change frequently |
| Nearby Places | 15 minutes | Google Places API is expensive |

### Frontend Caching Recommendations

| Data | Suggested Cache |
|------|-----------------|
| Decision options | 2-5 minutes |
| Food recommendations | 5-10 minutes |
| Map annotations | 5 minutes |
| Trip context | 1-2 minutes |

### Cache Invalidation

Server cache is invalidated when:
- User location changes significantly (>500m)
- Trip day changes (midnight in trip timezone)
- Activity status is updated

---

## Configuration & Dependencies

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API for decision agent |
| `GOOGLE_MAPS_PLATFORM_API_KEY` | Yes | - | Google Places API |
| `SUPABASE_URL` | Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Supabase service role |
| `DURING_TRIP_RATE_LIMIT` | No | `20` | Daily request limit per user |
| `DURING_TRIP_CACHE_TTL` | No | `300` | Context cache TTL (seconds) |

**Note**: Open-Meteo API is used for weather and requires no API key.

### External APIs

| API | Purpose | Rate Limits |
|-----|---------|-------------|
| OpenAI GPT-4o | Decision agent reasoning | Per your plan |
| Google Places | Food recommendations, nearby search | 50,000/day free |
| Open-Meteo | Weather data | 10,000/day free |

### Database Tables

| Table | Purpose |
|-------|---------|
| `trips` | Trip metadata, dates, destination |
| `member_profiles` | User preferences (dietary, interests) |
| `trip_members` | Trip membership for group trips |
| `trip_itineraries` | Generated itineraries (JSONB) |

---

## Testing & Verification

### Test Endpoint: Decision Agent

```bash
cd server
pnpm tsx src/tools/decisionAgentTestFunction.ts
```

This runs the decision agent with mock Paris trip context and outputs:
- AI reasoning process
- Tool calls made
- Final suggestions

### Manual API Testing

**1. Get context:**

```bash
curl -X POST http://localhost:5001/during-trip/context \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "your-trip-uuid",
    "location": { "lat": 48.8566, "lng": 2.3522 }
  }'
```

**2. Get decisions:**

```bash
curl -X POST http://localhost:5001/during-trip/decide \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "your-trip-uuid",
    "location": { "lat": 48.8566, "lng": 2.3522 }
  }'
```

**3. Accept suggestion:**

```bash
curl -X POST http://localhost:5001/during-trip/suggestions/accept \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trip_id": "your-trip-uuid",
    "suggestion": {
      "id": "test-cafe",
      "title": "Test Café",
      "type": "cafe",
      "coordinates": { "lat": 48.8540, "lng": 2.3325 }
    },
    "time_of_day": "morning",
    "duration_minutes": 60
  }'
```

### Expected Behaviors

| Scenario | Expected Result |
|----------|-----------------|
| Valid request with location | 200 with suggestions |
| Request without location | 200 with `location_approximate: true` |
| Invalid trip_id format | 400 validation error |
| User not trip member | 403 forbidden |
| 21st request of the day | 429 rate limited |
| No itinerary exists | 404 itinerary not found |
| AI timeout (>10s) | 200 with `fallback_used: true` |

---

## File References

| File | Purpose |
|------|---------|
| [duringTrip.routes.ts](../../src/routes/duringTrip.routes.ts) | Route definitions |
| [duringTrip.controller.ts](../../src/controllers/duringTrip.controller.ts) | Request handlers |
| [requireAuth.ts](../../src/middleware/requireAuth.ts) | JWT authentication |
| [requireTripAccess.ts](../../src/middleware/requireTripAccess.ts) | Trip authorization |
| [rateLimitDuringTrip.ts](../../src/middleware/rateLimitDuringTrip.ts) | Rate limiting |
| [contextBuilder.ts](../../src/utils/contextBuilder.ts) | Context aggregation |
| [decisionAgent.ts](../../src/utils/decisionAgent.ts) | AI decision agent |
| [foodRecommendations.ts](../../src/utils/foodRecommendations.ts) | Food utility |
| [mapIntelligence.ts](../../src/utils/mapIntelligence.ts) | Map annotations |
| [weatherService.ts](../../src/utils/weatherService.ts) | Open-Meteo integration |
| [validationSchemas.ts](../../src/utils/validationSchemas.ts) | Zod validation |
| [checkActivityConflicts.ts](../../src/utils/checkActivityConflicts.ts) | Conflict detection |
| [convertSuggestionToActivity.ts](../../src/utils/convertSuggestionToActivity.ts) | Suggestion conversion |
| [duringTripAgentTools.ts](../../src/tools/duringTripAgentTools.ts) | OpenAI tool definitions |
| [interface.ts](../../src/types/interface.ts) | TypeScript interfaces |

---

_Last updated: January 2026_
