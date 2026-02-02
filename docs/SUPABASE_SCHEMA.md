# Supabase Database Schema

## Overview
This database supports a collaborative trip planning application where users can create trips, share ideas from social media, react to ideas, and build itineraries together.

---

## Tables

### 1. **member_profiles**
**Purpose:** Stores user profiles with travel preferences

**Key Columns:**
- `id` (UUID, PK) - Unique profile identifier
- `user_id` (UUID, FK → auth.users) - Links to Supabase auth user
- `display_name` (TEXT) - User's display name
- `dietary` (TEXT[]) - Dietary restrictions/preferences
- `travel_style` (TEXT) - Travel pace: 'chill', 'balanced', or 'packed'
- `interests` (TEXT[]) - User interests
- `walking_tolerance` (TEXT) - Walking preference: 'low', 'medium', or 'high'

**Current Rows:** 7  
**RLS Enabled:** No

---

### 2. **trips**
**Purpose:** Core trip information and destination details

**Key Columns:**
- `id` (UUID, PK) - Unique trip identifier
- `title` (TEXT) - Trip name
- `destination` (TEXT) - Destination name
- `destination_lat`, `destination_lng` (NUMERIC) - Destination coordinates
- `start_date`, `end_date` (TIMESTAMPTZ) - Trip dates
- `created_by` (UUID, FK → member_profiles) - Trip creator

**Current Rows:** 23  
**RLS Enabled:** No

---

### 3. **trip_members**
**Purpose:** Links members to trips with their roles

**Key Columns:**
- `id` (UUID, PK) - Unique membership identifier
- `trip_id` (UUID, FK → trips) - Trip reference
- `member_id` (UUID, FK → member_profiles) - Member reference
- `role` (TEXT) - Member role: 'owner' or 'member'
- `joined_at` (TIMESTAMPTZ) - When member joined

**Current Rows:** 0  
**RLS Enabled:** No

---

### 4. **trip_reel_ideas**
**Purpose:** Travel ideas sourced from social media (TikTok/YouTube)

**Key Columns:**
- `id` (UUID, PK) - Unique idea identifier
- `trip_id` (UUID, FK → trips) - Associated trip
- `created_by` (UUID, FK → member_profiles) - Who added the idea
- `source_url` (TEXT) - Original social media URL
- `source_platform` (TEXT) - Platform: 'tiktok' or 'youtube'
- `source_video_id` (TEXT) - Video identifier
- `title`, `summary` (TEXT) - Enriched content
- `category` (TEXT) - Type: 'food', 'sightseeing', 'nature', 'shopping', 'nightlife', 'activity', 'stay', 'other'
- `cost_bucket` (TEXT) - Price level: '$', '$$', or '$$$'
- `duration_bucket` (TEXT) - Time needed: '30m', '1-2h', 'half-day'
- `time_of_day` (TEXT) - Best time: 'morning', 'afternoon', 'evening'
- `tags` (TEXT[]) - Categorization tags
- `location` (JSONB) - Location data
- `place` (JSONB) - Place details
- `latitude`, `longitude` (NUMERIC) - Coordinates
- `enrichment_status` (TEXT) - Processing state: 'CREATED', 'UNFURLED', 'SUMMARIZED', 'ENRICHED', 'DONE'

**Current Rows:** 34  
**RLS Enabled:** No

---

### 5. **trip_reel_idea_comments**
**Purpose:** Comments on trip ideas

**Key Columns:**
- `id` (UUID, PK) - Unique comment identifier
- `idea_id` (UUID, FK → trip_reel_ideas) - Associated idea
- `author_id` (UUID, FK → member_profiles) - Comment author
- `author_name` (TEXT) - Author's name (denormalized)
- `text` (TEXT) - Comment content

**Current Rows:** 0  
**RLS Enabled:** No

---

### 6. **trip_reel_idea_reactions**
**Purpose:** Member reactions/feedback on ideas

**Key Columns:**
- `id` (UUID, PK) - Unique reaction identifier
- `idea_id` (UUID, FK → trip_reel_ideas) - Associated idea
- `member_id` (UUID, FK → member_profiles) - Who reacted
- `member_name` (TEXT) - Member's name (denormalized)
- `signal` (TEXT) - Reaction type: 'fire', 'down', 'meh', 'skip'
- `comment` (TEXT) - Optional comment with reaction

**Current Rows:** 0  
**RLS Enabled:** No

---

### 7. **trip_reel_shortlist_items**
**Purpose:** Curated shortlist of selected ideas for a trip

**Key Columns:**
- `id` (UUID, PK) - Unique shortlist item identifier
- `trip_id` (UUID, FK → trips) - Associated trip
- `idea_id` (UUID, FK → trip_reel_ideas) - Shortlisted idea
- `member_id` (UUID, FK → member_profiles) - Who added to shortlist
- `sort_order` (INTEGER) - Display order

**Current Rows:** 0  
**RLS Enabled:** No

---

### 8. **trip_itineraries**
**Purpose:** Final planned itineraries for trips

**Key Columns:**
- `id` (UUID, PK) - Unique itinerary identifier
- `trip_id` (UUID, FK → trips) - Associated trip
- `itinerary` (JSONB) - Structured itinerary data

**Current Rows:** 0  
**RLS Enabled:** Yes ⚠️

---

## Data Flow

```
Social Media URL
     ↓
trip_reel_ideas (enrichment pipeline)
     ↓
[Members react] → trip_reel_idea_reactions
     ↓
[Members comment] → trip_reel_idea_comments
     ↓
[Members shortlist] → trip_reel_shortlist_items
     ↓
trip_itineraries (final plan)
```

## Notes
- Most tables have **RLS disabled** - consider enabling for production
- Uses **UUID** for all primary keys
- Timestamps use **timestamptz** for timezone awareness
- Enrichment pipeline tracks progress through status states
- Social media integration supports TikTok and YouTube
- Heavy use of **JSONB** for flexible data structures (location, place, itinerary)

