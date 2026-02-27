# Photo Guide Feature

The Photo Guide generates AI-powered selfie tips, pose ideas, and photo challenges for each spot on a given day of a trip itinerary. Users open a modal for any day, and the system produces a per-activity photography guide complete with example AI-generated selfie images.

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [User Flow](#user-flow)
3. [Architecture](#architecture)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [AI Generation Pipeline](#ai-generation-pipeline)
7. [Selfie Image Generation](#selfie-image-generation)
8. [Frontend Components](#frontend-components)
9. [Data Types](#data-types)
10. [Caching Strategy](#caching-strategy)
11. [Cost Considerations](#cost-considerations)

---

## Feature Overview

Each day of a trip itinerary has a corresponding Photo Guide that includes:

- **Pose of the Day** — A daily challenge for the whole group (e.g. "Jump Shot Challenge"). Has a title, description, and difficulty level (easy / medium / silly).
- **Per-Spot Tips** — For every activity in the day's itinerary:
  - **Selfie tip** — Where to stand, camera angles, framing advice.
  - **Pose idea** — A specific pose suggestion for the location.
  - **Best time** — Optimal lighting window (e.g. "Golden hour: 5:30–6:15pm").
  - **Group spot** — Whether the location is good for group photos, with a group-specific tip.
  - **Challenge** (optional) — A fun photo challenge specific to 1–2 iconic spots per day.
  - **image_prompt** — A detailed scene description (location, lighting, composition, pose) used by the image model to produce a realistic travel photo.
- **Photo Gallery** — Google Places photos and activity images displayed per spot.
- **AI Example Selfie** — An AI-generated image showing what a photo at each spot could look like (generated via Google Nano Banana 2, `gemini-3.1-flash-image-preview`). Each tip includes an **image_prompt** (rich scene description from GPT-4o-mini) used to drive realistic, context-aware image generation with multiple Google Places reference photos.

---

## User Flow

1. User opens the itinerary panel for a specific day (or the full trip).
2. **Generate all (optional):** User can call "Generate all photo guides" to create guides and selfie examples for every day of the trip in one go; results are cached per day.
3. User clicks the Photo Guide button to open the `PhotoGuideModal` for a day.
4. **First visit (no cached data):** The modal shows an empty state with a "Generate Photo Guide" button.
5. User clicks "Generate Photo Guide" (or has already run generate-all) → backend:
   - Reads the trip's itinerary for that day (or all days for generate-all)
   - Sends the activity list to GPT-4o-mini to generate tips plus a rich `image_prompt` per activity
   - Maps Google Places photos onto each tip
   - Pre-generates AI example images via Gemini Nano Banana 2 using reference photos + `image_prompt`
   - Caches everything in `trip_photo_guides`
   - Returns the complete guide
6. **Subsequent visits:** The cached guide is returned instantly from Supabase (no AI call).
7. User browses spots using the bottom navigation tabs.
8. For each spot, user sees the photo gallery (left) and tips/info (right).
9. User can click "Regenerate example" to get a fresh AI image for any spot.

---

## Architecture

```
┌─────────────────────────────────────┐
│  PhotoGuideModal (React component)  │
│  └── usePhotoGuide hook             │
│       ├── Supabase direct read      │  (initial load / cache check)
│       ├── POST /photo-guide/:tripId │  (generate one day)
│       ├── POST .../generate-all     │  (generate all days, cache each)
│       └── POST .../generate-selfie  │  (regenerate selfie)
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Express Server                     │
│  └── /photo-guide (routes)          │
│       ├── getOrCreatePhotoGuide     │  controller
│       ├── generateAllPhotoGuides    │  controller
│       └── generateSelfie            │  controller
│            │                        │
│            ▼                        │
│  ┌─── generatePhotoGuideWithAI ───┐ │  GPT-4o-mini (text → JSON + image_prompt)
│  └─── generateSelfieImage ────────┘ │  Gemini 3.1 Flash Image (multi-photo + prompt)
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Supabase (PostgreSQL)              │
│  └── trip_photo_guides              │  cached guide_data (JSONB)
│  └── trips                          │  trip metadata
│  └── trip_itineraries               │  day activities
│  └── trip_reel_ideas                │  Google Places photos
└─────────────────────────────────────┘
```

---

## API Endpoints

All endpoints are mounted at `/photo-guide` and require authentication (`requireAuth` middleware).

### POST `/photo-guide/:tripId`

**Get or create** the photo guide for a specific day.

**Request body:**

```json
{ "day_number": 1 }
```

**Logic:**

1. Check `trip_photo_guides` for an existing cached guide for this `(trip_id, day_number)` pair.
2. If cached → return `{ guide_data }` immediately.
3. If not cached:
   - Fetch the trip's destination from `trips`.
   - Fetch the latest itinerary from `trip_itineraries`.
   - Extract activities for the requested day.
   - Call `generatePhotoGuideWithAI()` with the destination and activity list.
   - Map place photos from the itinerary data onto each tip.
   - Pre-generate AI selfie images for each spot that has a place image.
   - Upsert the complete guide into `trip_photo_guides`.
   - Return `{ guide_data }`.

**Response (200):**

```json
{
  "guide_data": {
    "pose_of_the_day": {
      "title": "Market Munch Challenge",
      "description": "Everyone take a bite of your favorite street food with the market hustle behind you!",
      "difficulty": "silly"
    },
    "tips": [
      {
        "activity_name": "Ben Thanh Market",
        "selfie_tip": "Stand near the entrance for a vibrant backdrop...",
        "pose_idea": "Hold a Bánh Mì in one hand and a tropical fruit in the other, smiling wide!",
        "best_time": "Morning light for the freshest colors, around 8-10am.",
        "is_group_spot": true,
        "group_tip": "Gather in front of the market sign, making sure the stalls fill the background.",
        "challenge": {
          "description": "Snap a pic holding your favorite food item while trying not to laugh!",
          "difficulty": "silly"
        },
        "image_url": "https://...",
        "image_urls": ["https://...", "https://..."],
        "generated_selfie_base64": "iVBOR..."
      }
    ]
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | `day_number` missing or invalid |
| 400 | Invalid itinerary structure |
| 404 | Trip not found |
| 404 | Itinerary not found |
| 404 | No activities for requested day |
| 500 | Supabase or OpenAI error |

---

### POST `/photo-guide/:tripId/generate-all`

**Generate photo guides and selfie examples for all days** of the trip in one request. Already-cached days are skipped; only missing days are generated and stored.

**Request body:** None (optional `Content-Type: application/json`).

**Logic:**

1. Fetch the trip and latest itinerary from Supabase.
2. Load existing `trip_photo_guides` rows for this `trip_id`.
3. For each day in the itinerary that has activities:
   - If a cached guide exists for that day → include it in the response and skip generation.
   - Otherwise: call `generatePhotoGuideWithAI()` for that day, map place photos to tips, pre-generate selfie images via `generateSelfieImage()` (Gemini), upsert the guide into `trip_photo_guides`, and add it to the response.
4. Return all guides (cached + newly generated) keyed by day number.

**Response (200):**

```json
{
  "guides": {
    "1": { "pose_of_the_day": { ... }, "tips": [ ... ] },
    "2": { "pose_of_the_day": { ... }, "tips": [ ... ] }
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 404 | Trip not found |
| 404 | Itinerary not found |
| 400 | Invalid or empty itinerary |
| 500 | Supabase or AI error |

---

### POST `/photo-guide/:tripId/generate-selfie`

**Regenerate** the AI selfie example for a specific activity within an existing guide.

**Request body:**

```json
{
  "day_number": 1,
  "activity_name": "Ben Thanh Market"
}
```

**Logic:**

1. Fetch the existing guide from `trip_photo_guides`.
2. Find the tip matching `activity_name` (case-insensitive).
3. If the tip already has a `generated_selfie_base64`, return it (cached).
4. Otherwise, call `generateSelfieImage()` with the tip's `image_urls` (or single URL), `image_prompt`, and challenge/pose context.
5. Update the guide in the database with the new base64 image.
6. Return `{ image_base64 }`.

**Response (200):**

```json
{
  "image_base64": "iVBORw0KGgoAAAANS..."
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Missing `day_number` or `activity_name` |
| 400 | No place image available for the activity |
| 404 | Photo guide not found (must generate first) |
| 500 | Gemini image generation failure |

---

## Database Schema

### `trip_photo_guides`

```sql
CREATE TABLE public.trip_photo_guides (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  trip_id     UUID        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day_number  INTEGER     NOT NULL,
  guide_data  JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT trip_photo_guides_pkey PRIMARY KEY (id),
  CONSTRAINT trip_photo_guides_trip_day_unique UNIQUE (trip_id, day_number)
);
```

- **Unique constraint** on `(trip_id, day_number)` ensures one guide per day per trip.
- **`guide_data`** stores the full `IPhotoGuideData` JSON including base64 selfie images.
- **Cascade delete** — when a trip is deleted, its photo guides are removed.
- **Indexes** on `trip_id` and `(trip_id, day_number)` for fast lookups.

---

## AI Generation Pipeline

### `generatePhotoGuideWithAI(destination, activities)`

**File:** `server/src/utils/generatePhotoGuide.ts`

**Model:** `gpt-4o-mini` with JSON response format.

**Input:**

- `destination` — Trip destination string (e.g. "Ho Chi Minh City, Vietnam").
- `activities` — Array of `{ name, description, time_of_day, category }` for the day.

**System prompt:** Instructs the model to act as a "fun travel photo guide" generating selfie tips, pose ideas, and optional challenges. Uses difficulty levels: easy, medium, silly.

**User prompt:** Lists the destination and each activity, then specifies the exact JSON schema expected in the response. Key instructions:
- One tip per activity, in order.
- Every tip must have `activity_name`, `selfie_tip`, `pose_idea`, `best_time`, `is_group_spot`, and `image_prompt`.
- `image_prompt`: 2–4 sentences describing the ideal photo (location, lighting, composition, pose, mood) for use by the image model; concrete and visual; style varies by activity type (food vs landmark vs nature vs nightlife).
- `group_tip` only when `is_group_spot` is true.
- `challenge` only for 1–2 iconic spots per day.

**Output:** Parsed `IPhotoGuideData` containing `pose_of_the_day` and `tips[]` (each tip includes `image_prompt`).

**Temperature:** 0.7 (moderate creativity for fun, varied suggestions).

---

## Selfie Image Generation

### `generateSelfieImage(placeImageUrls, options?)`

**File:** `server/src/utils/generateSelfieImage.ts`

**Model:** Google Nano Banana 2 (`gemini-3.1-flash-image-preview`) via the `@google/genai` SDK (`generateContent` with `responseModalities: ["TEXT", "IMAGE"]`).

**How it works:**

1. Accepts one or more **place image URLs** (e.g. from Google Places); up to 3 are used as reference images.
2. Fetches each image and converts to base64 for the API.
3. Builds the text prompt:
   - **Preferred:** `options.imagePrompt` — the rich scene description from GPT-4o-mini (location, lighting, composition, pose, mood).
   - **Fallback:** If no `imagePrompt`, builds a prompt from `challengeDescription` or `poseIdea` for a photorealistic travel photo.
4. Sends to Gemini: `contents: [{ role: "user", parts: [ ...inlineData for each reference image, { text: prompt } ] }]` with `config.responseModalities: ["TEXT", "IMAGE"]`.
5. Extracts the generated image from `response.candidates[0].content.parts` (part with `inlineData.data`) and returns it as base64.

**Pre-generation:** During guide creation (per-day or generate-all), selfie images are pre-generated for every spot that has at least one place image. Users see AI example images on first load. Requires `GEMINI_API_KEY` in server environment.

---

## Frontend Components

### `PhotoGuideModal`

**File:** `client/mf-itinerary/src/components/PhotoGuideModal.tsx`

The main modal component. Layout:

| Section | Description |
|---------|-------------|
| **Header** | Day number, spot count, close button |
| **Pose of the Day banner** | Compact row showing the daily group challenge with difficulty badge |
| **Two-panel content** | Left: `PhotoGallery` (place photos with nav arrows + thumbnails). Right: `SpotInfo` (tips, pose, group tip, challenge, selfie CTA) |
| **Spot navigation** | Bottom tab strip showing all spots with thumbnails and best-time info |

Sub-components:
- `PoseOfTheDayBanner` — Renders the daily pose challenge.
- `PhotoGallery` — Image carousel with hero image, prev/next arrows, counter badge, and thumbnail strip.
- `SpotInfo` — Activity name, best time, "How to Shoot" section, group tip card, challenge badge, and "Regenerate example" / "See an example selfie" button with AI preview.
- `SpotNav` — Horizontal scrollable tab bar for switching between photo spots.
- `SkeletonLoader` — Loading placeholder shown during generation.

### `usePhotoGuide` Hook

**File:** `client/mf-itinerary/src/hooks/usePhotoGuide.ts`

Manages all data fetching and state for the Photo Guide feature.

| Method | Description |
|--------|-------------|
| `data` | The current `PhotoGuideData` (or null) |
| `spotPhotos` | Extra Google Places photos fetched from `trip_reel_ideas` |
| `isLoading` | Loading state |
| `error` | Error message string |
| `generate()` | Calls `POST /photo-guide/:tripId` to create a new guide for the current day |
| `generateAll()` | Calls `POST .../generate-all` to generate guides for all days, then refetches current day |
| `refetch()` | Re-reads the guide from Supabase directly (after selfie regeneration) |
| `generateSelfie(activityName)` | Calls `POST .../generate-selfie` and returns a data URL |

**Data sources on mount:**
1. Reads `trip_photo_guides` directly from Supabase (cache check — no server round-trip).
2. Reads `trip_reel_ideas` from Supabase to get extra Google Places photos for each activity.

---

## Data Types

### Backend (`server/src/utils/generatePhotoGuide.ts`)

```typescript
interface IPhotoChallenge {
  description: string;
  difficulty: "easy" | "medium" | "silly";
}

interface IPhotoTip {
  activity_name: string;
  image_url?: string;
  image_urls?: string[];
  generated_selfie_base64?: string;
  selfie_tip: string;
  pose_idea: string;
  best_time: string;
  is_group_spot: boolean;
  group_tip?: string;
  challenge?: IPhotoChallenge;
  image_prompt?: string;  // rich scene description for AI image generation
}

interface IPoseOfTheDay {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "silly";
}

interface IPhotoGuideData {
  pose_of_the_day: IPoseOfTheDay;
  tips: IPhotoTip[];
}
```

### Frontend (`client/mf-itinerary/src/types.ts`)

Mirrors the backend types as `PhotoGuideData`, `PhotoTip`, `PoseOfTheDay`, `PhotoChallenge`, and `PhotoChallengeDifficulty`.

---

## Caching Strategy

The feature uses a two-level cache:

1. **Database cache (Supabase):** The full `guide_data` JSONB (including base64 selfie images) is stored per `(trip_id, day_number)`. Subsequent requests return the cached data without any AI calls.
2. **Client-side direct read:** On modal open, the `usePhotoGuide` hook reads directly from Supabase via the client SDK (bypassing the server) for instant display. The server is only called when generating new data.

**Cache invalidation:** Currently, guides are never automatically invalidated. If the itinerary changes, a new guide would need to be explicitly regenerated. The upsert uses `onConflict: "trip_id,day_number"` so regeneration overwrites the previous guide.

---

## Cost Considerations

| Operation | Model | Approximate Cost |
|-----------|-------|-----------------|
| Photo guide text generation | GPT-4o-mini | ~$0.01–0.02 per day |
| Selfie image generation | Gemini 3.1 Flash Image (Nano Banana 2) | ~$0.015–0.04 per image |
| Pre-generation (N spots) | Gemini × N | ~$0.015–0.04 × N per day |

For a typical day with 3 photo spots, initial generation costs roughly **$0.05–0.14** (text + 3 images). Generate-all for a 5-day trip with 15 spots is ~$0.23–0.60. Subsequent views are free (cached). Regenerating a single selfie costs ~$0.015–0.04.

**Environment:** The server requires `GEMINI_API_KEY` (Google AI Studio or Vertex) for image generation. See `server/.env.example`.
