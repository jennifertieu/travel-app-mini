# AI Chat-Based Map Annotation System

## Overview

Enable users to create map annotations through natural language chat instead of manual drawing. The AI agent will interpret location requests, fetch geographic boundaries, and create annotations with appropriate shapes, colors, and labels.

---

## Core Capabilities

### What the AI Agent Can Do

1. **Understand Natural Language Locations**
   - "Mark downtown Paris for hotels"
   - "Highlight the Latin Quarter"
   - "Create a search area around the Eiffel Tower"
   - "Add a note on Montmartre for cafes"

2. **Create Annotations with Different Shapes**
   - **Rectangles (Primary)**: Bounding boxes from Google Geocoding API
   - **Polygons (Advanced)**: Actual boundaries for neighborhoods, parks, landmarks
     - Source 1: Google Maps Data-Driven Styling for Boundaries API (localities, administrative areas)
     - Source 2: OpenStreetMap Overpass API (detailed boundaries for parks, districts, landmarks)

3. **Infer Annotation Properties**
   - **Color/Category**: Hotels (blue), Food (yellow), Nature (green), Priority (red), Fun (purple)
   - **Intent**: Annotation (note) vs. Search Area (AI search trigger)
   - **Label**: Auto-generate from user message
   - **Name**: Location name from geocoding result

4. **Contextual Awareness**
   - Know trip destination to disambiguate locations
   - Avoid duplicate annotations
   - Suggest alternatives when locations are ambiguous
   - Reference existing annotations ("near that hotel area I marked")

---

## Shape Determination Logic

### Rectangle Annotations (Fast & Simple)

**When to use**: Default for most requests, POIs, addresses

**Data Source**: Google Geocoding API
- Returns: `geometry.bounds` (northeast/southwest corners)
- Fallback: Create box around center point with configurable radius

**Example**:
```
User: "Mark Times Square"
→ Rectangle: 500m × 500m box around coordinates
```

### Polygon Annotations (Accurate Boundaries)

**When to use**: Neighborhoods, parks, landmarks, administrative areas

**Data Sources**:

1. **Google Maps Boundaries API** (Preferred)
   - Coverage: Countries, states, localities/neighborhoods, postal codes
   - Returns: Actual polygon boundaries for administrative areas
   - Use Place IDs to fetch specific feature polygons

2. **OpenStreetMap Overpass API** (Fallback/Supplement)
   - Coverage: Parks, districts, landmarks, building footprints
   - Query: `rel[boundary=administrative][name="Latin Quarter"][admin_level=8]`
   - Returns: MultiPolygon geometry in GeoJSON format

**Polygon Simplification**:
- Limit to 50 points max (simplify complex boundaries)
- Fallback to rectangle if polygon too complex or unavailable

**Example**:
```
User: "Highlight Central Park"
→ Polygon: Actual park boundary (8-12 points)

User: "Mark 5th arrondissement" 
→ Polygon: Administrative boundary from OSM/Google (20-40 points simplified)
```

---

## Chat Interface Design

### UI Placement

**Option A: Sidebar Panel** (Recommended)
- Fixed chat panel on right side of TripView
- Collapses when not in use
- Persistent chat history per trip
- Shows map annotations being created in real-time

**Option B: Modal Overlay**
- Full-screen chat modal over map
- Better for focused interaction
- Hides when done

### Chat Features

1. **Message Types**
   - User text messages
   - AI text responses
   - Annotation creation confirmations with preview
   - Error/clarification messages

2. **Special UI Elements**
   - **Annotation Cards**: Show preview when AI creates annotation
   - **Location Suggestions**: Dropdown when location is ambiguous
   - **Undo Button**: Remove last created annotation

3. **Quick Actions**
   - "Search this area" button on annotation cards
   - "Show on map" button to pan/zoom to annotation
   - Color picker to change category

---

## AI Agent Architecture

### Agent Model
- **Model**: GPT-4o (same as decision agent)
- **Temperature**: 0.3 (consistent, predictable)
- **Timeout**: 10 seconds
- **Max Iterations**: 10 tool calls

### System Prompt Structure

```
You are a map annotation assistant for a trip to {destination}.
User's current trip context:
- Destination: {trip.destination}
- Dates: {trip.start_date} - {trip.end_date}
- Existing annotations: {list of current annotations}

Your role:
1. Interpret location requests
2. Use tools to geocode and fetch boundaries
3. Create annotations with appropriate colors/labels
4. Ask for clarification if location is ambiguous
5. Be concise and helpful

When user asks to mark/highlight/annotate a location:
- Determine location type (neighborhood, POI, area)
- Choose appropriate shape (polygon for areas, rectangle for points)
- Infer category/color from context (hotels=blue, food=yellow, etc.)
- Create annotation and confirm to user
```

### Agent Tools

#### 1. `geocode_location`
```typescript
{
  name: "geocode_location",
  description: "Convert location name to coordinates and bounds",
  parameters: {
    location_query: string,  // "Latin Quarter" or "near Eiffel Tower"
    trip_destination: string // For context: "Paris, France"
  },
  returns: {
    lat: number,
    lng: number,
    bounds: { ne: {lat, lng}, sw: {lat, lng} },
    place_id: string,
    types: string[], // ["neighborhood", "political"]
    formatted_address: string
  }
}
```

#### 2. `fetch_polygon_boundary`
```typescript
{
  name: "fetch_polygon_boundary",
  description: "Get actual polygon boundary for neighborhood/park/landmark",
  parameters: {
    place_id: string,      // From geocode_location
    location_name: string,
    boundary_type: "google_boundaries" | "osm_overpass"
  },
  returns: {
    polygon_points: Array<{lat: number, lng: number}>,
    simplified: boolean,
    area_km2: number
  }
}
```

#### 3. `create_map_annotation`
```typescript
{
  name: "create_map_annotation",
  description: "Create annotation on trip map",
  parameters: {
    coordinates: {
      type: "box" | "polygon",
      // For box:
      north?: number, south?: number, east?: number, west?: number,
      // For polygon:
      points?: Array<{lat: number, lng: number}>
    },
    name: string,          // "Downtown Paris"
    label: string,         // "Hotels area"
    color: string,         // "#3B82F6"
    intent: "annotation" | "search_area"
  },
  returns: {
    annotation_id: string,
    area_km2: number
  }
}
```

#### 4. `list_existing_annotations`
```typescript
{
  name: "list_existing_annotations",
  description: "Get current annotations on the map",
  returns: Array<{
    id: string,
    name: string,
    label: string,
    coordinates: {...}
  }>
}
```

#### 5. `search_places_in_annotation`
```typescript
{
  name: "search_places_in_annotation",
  description: "Trigger AI search within annotation area (converts to search_area)",
  parameters: {
    annotation_id: string,
    search_query: string  // "sushi restaurants"
  }
}
```

---

## Database Schema

### New Table: `trip_chat_messages`

```sql
CREATE TABLE trip_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES member_profiles(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB, -- { annotation_id, tool_calls, etc. }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trip_chat_messages_trip_id ON trip_chat_messages(trip_id);
CREATE INDEX idx_trip_chat_messages_created_at ON trip_chat_messages(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trip_chat_messages;
```

### Existing Table: `trip_annotations`
- **No changes needed** - Already supports both box and polygon coordinates
- Current schema already has: `name`, `label`, `intent`, `color`, `coordinates` (JSONB)

---

## User Flows

### Flow 1: Simple Rectangle Annotation

```
User: "Mark downtown for hotels"

Agent Process:
1. Geocode "downtown [trip destination]"
   → Returns: { lat: 48.856, lng: 2.341, bounds: {...}, type: "neighborhood" }
2. Create rectangle annotation with bounds
3. Set color to blue (hotels category)

Response: "I've marked downtown Paris for hotels (2.1 km²). 
           [Show annotation card with preview]"
```

### Flow 2: Polygon Boundary Annotation

```
User: "Highlight Central Park"

Agent Process:
1. Geocode "Central Park, New York"
   → Returns: { place_id: "ChIJ...", types: ["park", "tourist_attraction"] }
2. Detect park type → Fetch polygon boundary
3. Call fetch_polygon_boundary(place_id, "osm_overpass")
   → Returns: Simplified 12-point polygon
4. Create polygon annotation

Response: "I've highlighted Central Park (3.4 km²) with its actual boundary. 
           [Show annotation card with polygon preview]"
```

### Flow 3: Ambiguous Location

```
User: "Mark the tower area"

Agent Process:
1. Geocode "tower [destination]"
   → Multiple results: Eiffel Tower, Montparnasse Tower, etc.

Response: "I found multiple matches. Which did you mean?
           1. Eiffel Tower area
           2. Montparnasse Tower area
           3. Something else?"

User: "First one"

Agent: Creates annotation around Eiffel Tower
```

### Flow 4: AI Search Area

```
User: "Find sushi restaurants in downtown"

Agent Process:
1. Create search_area annotation for downtown
2. Automatically trigger useBoxSearch hook
3. Add 5 sushi restaurant ideas to map

Response: "I've searched downtown and added 5 sushi restaurants to your trip ideas. 
           [Show list of added places]"
```

### Flow 5: Reference Existing Annotation

```
User: "Can you search for cafes in that hotel area I marked?"

Agent Process:
1. Call list_existing_annotations()
2. Find annotation with "hotel" in label/name
3. Call search_places_in_annotation(annotation_id, "cafes")

Response: "I found 8 cafes in the downtown hotel area. Added them to your map."
```

---

## Technical Implementation Details

### Backend Routes

**File**: `server/src/routes/chat.routes.ts`

```typescript
// POST /chat/message - Send message and get AI response
router.post("/chat/message", requireAuth, requireTripAccess, rateLimitChat, sendChatMessage);

// GET /chat/:tripId/history - Get chat history
router.get("/chat/:tripId/history", requireAuth, requireTripAccess, getChatHistory);

// DELETE /chat/message/:id - Delete message
router.delete("/chat/message/:id", requireAuth, deleteChatMessage);
```

### Backend Controller

**File**: `server/src/controllers/chat.controller.ts`

**Key Functions**:
- `sendChatMessage`: Main endpoint, calls chatAgent
- `getChatHistory`: Fetch messages for trip
- `deleteChatMessage`: Remove message (and associated annotation if any)

### Chat Agent

**File**: `server/src/utils/chatAgent.ts`

**Similar to**: `decisionAgent.ts`

**Key Logic**:
- Build system prompt with trip context + existing annotations
- Handle tool calls (geocode, fetch boundaries, create annotations)
- Parse responses and validate
- Return chat message + metadata (annotation_ids created)

### Geocoding Service

**File**: `server/src/utils/geocodingService.ts`

**Functions**:
- `geocodeLocation(query, destination)`: Google Geocoding API
- `fetchGoogleBoundaryPolygon(placeId)`: Google Boundaries API
- `fetchOSMBoundaryPolygon(locationName)`: Overpass API query
- `simplifyPolygon(points, maxPoints)`: Reduce polygon complexity

### Frontend Hooks

**File**: `client/mf-pretrip/src/hooks/useTripChat.ts`

```typescript
export function useTripChat(tripId: string) {
  // Fetch chat history
  const { data: messages } = useQuery(['chat', tripId], ...)
  
  // Send message mutation
  const { mutateAsync: sendMessage } = useMutation(...)
  
  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel(`chat:${tripId}`)...
  })
  
  return { messages, sendMessage, isLoading }
}
```

### Frontend Components

**File**: `client/mf-pretrip/src/components/chat/TripChatPanel.tsx`

**Features**:
- Message list with user/AI bubbles
- Input field with send button
- Annotation preview cards
- Collapsible sidebar
- Loading states

**File**: `client/mf-pretrip/src/components/chat/AnnotationPreviewCard.tsx`

**Shows**:
- Annotation name and label
- Color category
- Area size
- "Show on map" button
- "Search this area" button (if applicable)

---

## Configuration & Limits

### Rate Limiting
- **Per user per trip**: 50 messages per day
- **Per user global**: 100 messages per day
- **Reasoning**: Chat messages trigger API calls (geocoding, LLM, boundary fetching)

### Cost Estimates (per chat interaction)
- GPT-4o: ~$0.02 per message (with tool calls)
- Google Geocoding: $0.005 per request
- Google Boundaries: Free (part of Maps JS API)
- OSM Overpass: Free
- **Total**: ~$0.025 per annotation created

### Polygon Complexity Limits
- **Max points**: 50 per polygon
- **Simplification threshold**: If boundary has >50 points, simplify using Douglas-Peucker
- **Fallback**: If simplification fails, use bounding box rectangle

### Timeout & Fallbacks
- **Agent timeout**: 10 seconds
- **Geocoding timeout**: 3 seconds
- **Boundary fetch timeout**: 5 seconds
- **Fallback**: If polygon fetch fails, use rectangle from geocoding bounds

---

## Edge Cases & Error Handling

### 1. Location Not Found
```
User: "Mark that cool spot"
Agent: "I couldn't find a specific location. Could you be more specific? 
        For example: 'Mark Le Marais for shopping'"
```

### 2. Location Outside Trip Destination
```
User: "Highlight Tokyo Tower"
Trip: Paris

Agent: "Tokyo Tower is in Japan, but this trip is to Paris. 
        Did you mean a tower in Paris, like the Eiffel Tower?"
```

### 3. Polygon Fetch Fails
```
Agent tries: fetch_polygon_boundary("Latin Quarter")
→ Error: Boundary not available

Fallback: Use rectangle from geocoding bounds
Response: "I've marked the Latin Quarter area (using estimated bounds)"
```

### 4. Duplicate Annotation
```
User: "Mark downtown for hotels"
Existing: Annotation "Downtown Hotels" already exists

Agent: "You already have a 'Downtown Hotels' annotation. 
        Would you like me to create another one or modify the existing one?"
```

### 5. Ambiguous Intent
```
User: "Show me hotels downtown"

Clarify: "search_area" vs "annotation"
Agent: "Would you like me to:
        1. Search for specific hotels and add them to your trip
        2. Mark the downtown area for hotels (without searching yet)"
```

---

## Testing Strategy

### Unit Tests
- Geocoding service (mock Google API responses)
- Polygon simplification algorithm
- Annotation creation logic

### Integration Tests
- Chat agent tool calling flow
- Database insert/realtime subscription
- Frontend chat → backend → map update

### Manual Testing Scenarios
1. Create rectangle annotation via chat
2. Create polygon annotation for park
3. Handle ambiguous location
4. Create search area and verify AI search triggers
5. Reference existing annotation in chat
6. Test with different trip destinations
7. Test rate limiting
8. Test offline/error states

---

## Future Enhancements (Out of Scope for MVP)

1. **Voice Input**: Speak to create annotations
2. **Image Analysis**: Upload photo → AI identifies location and creates annotation
3. **Multi-Language Support**: Chat in any language
4. **Annotation Suggestions**: AI proactively suggests annotations based on itinerary
5. **Collaborative Chat**: All trip members see same chat (currently per-user)
6. **Annotation Editing**: "Move that hotel area 500m north"
7. **Smart Merging**: Combine overlapping annotations automatically
8. **Export**: Download annotations as KML/GeoJSON

---

## Success Metrics

### Functionality
- ✅ 90%+ of location queries successfully geocoded
- ✅ 70%+ of requests create correct shape (polygon vs rectangle)
- ✅ <5 second average response time (geocode + AI + create)

### User Experience
- ✅ Users create annotations 3x faster than manual drawing
- ✅ 80%+ of annotations created with correct category/color
- ✅ <10% error rate requiring clarification

### Performance
- ✅ No impact on map rendering performance (polygon simplification works)
- ✅ Realtime updates <500ms after creation
- ✅ Chat history loads <1 second

---

## Implementation Checklist

- [ ] Create `trip_chat_messages` table with realtime support
- [ ] Build geocoding service with Google API and polygon boundary fetching (Google Boundaries + OSM Overpass)
- [ ] Implement chatAgent with 5 tools (geocode, fetch_boundary, create_annotation, list_annotations, search_places)
- [ ] Create chat routes and controller (POST /message, GET /history, DELETE /message)
- [ ] Add rate limiting middleware for chat (50/day per trip)
- [ ] Create `useTripChat` hook with realtime subscription
- [ ] Build `TripChatPanel` component with message list and input
- [ ] Create `AnnotationPreviewCard` component for chat messages
- [ ] Wire up chat panel to TripView and test end-to-end annotation creation
- [ ] Implement fallbacks for geocoding failures, polygon simplification, and ambiguous locations
