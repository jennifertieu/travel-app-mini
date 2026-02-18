# 🚀 Realtime Collaboration & AI Search (Hackathon Plan)

> **Goal:** Transform the travel planning experience from a static form into a living, breathing multiplayer map—like "Figma for Travel".

## ✨ Key Features

### 1. Multiplayer Presence ("Who's here?")
*   **Live Indicator:** See exactly how many people are planning with you right now.
*   **Avatars:** User bubbles show up at the bottom of the screen when they join.
*   **Tech:** Uses **Supabase Presence** to sync online state instantly without database writes.

### 2. Live Shared Cursors
*   **Map-Locked Accuracy:** Unlike normal screen sharing, our cursors are tied to **Geolocation (Lat/Lng)**.
    *   *If I point at the Eiffel Tower, you see my cursor at the Eiffel Tower, even if your map is zoomed out or panned to a different view.*
*   **Smooth Interpolation:** Cursors glide at 60fps using CSS transitions, making the experience feel premium and native.
*   **Tech:** Uses **Supabase Broadcast** (WebSockets) for low-latency updates (throttled to 50ms).

### 3. "Draw Mode" (Spatial Annotations)
*   **Interactive Drawing:** Toggle "Draw Mode" to click-and-drag rectangular boxes directly on the map.
*   **Persistent:** Annotations are saved to the database, so async team members see them later.
*   **Use Cases:**
    *   "Let's stay in this neighborhood."
    *   "This area is too touristy, avoid it."

### 4. Contextual AI Search
*   **The "Magic" Feature:** Turn any drawn box into a search query.
*   **Workflow:**
    1.  Draw a box around a specific area (e.g., SoHo).
    2.  Select **"AI Search"**.
    3.  Ask: *"Authentic jazz clubs"* or *"Cheap pizza"*.
    4.  **Result:** The AI searches *only* within those geographic bounds and instantly adds the best results to your trip board.

---

## 🛠️ Technical Architecture

### Database Schema (`trip_annotations`)
We added a new table to persist map drawings:
```sql
table trip_annotations {
  id: uuid
  trip_id: uuid
  coordinates: jsonb { north, south, east, west }
  label: text
  intent: 'annotation' | 'search_area'
  color: text
}
```

### Frontend Components
1.  **`useRealtimeTrip`**: A custom hook that manages the WebSocket connection, syncing `onlineUsers`, `cursors`, and `annotations`.
2.  **`MapCursorOverlay`**: A dedicated Leaflet layer that renders remote user cursors with smooth physics.
3.  **`MapView`**: Upgraded with:
    *   Mouse event listeners for drawing.
    *   Rendering logic for persisted boxes (`L.rectangle`).
4.  **`AnnotationModal`**: The UI bridge between drawing a box and triggering an AI action.

### Data Flow
1.  **Cursor Move** -> `useRealtimeTrip` -> **Broadcast (Lat/Lng)** -> Other Clients -> `MapCursorOverlay`
2.  **Draw Box** -> `AnnotationModal` -> **Save to DB** -> `postgres_changes` -> Other Clients Map updates
3.  **AI Search** -> `useBoxSearch` -> **Place Search API (Bounded)** -> Add `trip_reel_ideas` -> Realtime update

---

## 🎮 How to Demo

1.  **Open two windows** (e.g., Chrome and Incognito).
2.  **Join the same trip** in both.
3.  **Move your mouse** in one window -> watch it move in the other (note how it sticks to map locations!).
4.  **Click the Pencil Icon** (top right of map).
5.  **Draw a box** around a city center.
6.  **Select "AI Search"** and type *"Coffee"*.
7.  Watch new coffee shop pins drop onto the map for **both** users instantly.
