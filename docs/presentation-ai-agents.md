# TripWeave — AI Agent Architecture
## Hackathon Presentation (2.5 minutes)

---

## Opening (15 seconds)

> "TripWeave doesn't just use AI — it orchestrates 14 AI-powered services
> across 3 models, 3 agentic loops, a real-time voice interface, and a
> streaming architecture that keeps the UI alive while AI thinks. Two of
> those agents work on the itinerary alone — one builds it from scratch,
> another lets you modify it through natural language conversation. Every
> phase of trip planning — from pasting a TikTok link to getting live
> food recommendations on the ground — has an AI layer underneath it."

---

## The Problem (15 seconds)

Most travel apps bolt on a single chatbot. That's not enough:

```
TYPICAL "AI-POWERED" TRAVEL APP
┌─────────────────────────────────────────────┐
│                                             │
│   User: "Plan my trip to Tokyo"             │
│   Bot:  Here's a generic 5-day itinerary.   │
│                                             │
│   No real-time context.                     │
│   No location awareness.                    │
│   No tool use.                              │
│   No streaming.                             │
│   One model. One prompt. One response.      │
│                                             │
└─────────────────────────────────────────────┘

  Result: feels like ChatGPT with a travel skin.
```

---

## Our Architecture — 14 AI Services, 3 Models (20 seconds)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRIPWEAVE AI ARCHITECTURE                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    AGENTIC (Tool-Calling)                    │    │
│  │                                                             │    │
│  │  ┌──────────────────┐ ┌──────────────────────┐ ┌─────────────────────────┐ │
│  │  │ ITINERARY BUILDER│ │ ITINERARY CHAT AGENT │ │ DECISION AGENT          │ │
│  │  │ GPT-4o-mini      │ │ GPT-4o-mini          │ │ "What Now?"             │ │
│  │  │ 5 tools          │ │ 8 tools              │ │ GPT-4o-mini             │ │
│  │  │ One-shot         │ │ Multi-turn, SSE      │ │ 5 tools, 10 iters       │ │
│  │  │ Builds schedule  │ │ Edits via chat       │ │ Live context-aware recs │ │
│  │  │ from ideas       │ │ Preview → confirm    │ │                         │ │
│  │  └──────────────────┘ └──────────────────────┘ └─────────────────────────┘ │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    VOICE (Real-time)                         │    │
│  │                                                             │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ VOICE ASSISTANT — OpenAI Realtime API (WebSocket)   │    │    │
│  │  │ gpt-4o-realtime-preview · Push-to-talk              │    │    │
│  │  │ Trip-context system prompt · Client-side tools      │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    GENERATION SERVICES                       │    │
│  │                                                             │    │
│  │  AI Suggestions · Area Search · Enrichment Pipeline         │    │
│  │  Cost Enrichment · Travel Guide · Photo Guide               │    │
│  │  Selfie Generation (Gemini) · Flight Ranking                │    │
│  │  Hotel Recommendation · Food Recommendations                │    │
│  │                                                             │    │
│  │  GPT-4o-mini + Gemini 2.0 Flash                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    STREAMING LAYER                           │    │
│  │                                                             │    │
│  │  SSE (Server-Sent Events) for progressive generation        │    │
│  │  Supabase Realtime for data delivery (fully decoupled)      │    │
│  │  If SSE drops → data still arrives via Realtime             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

  Models used:
  • OpenAI GPT-4o-mini      — all server-side AI (agents, generation, ranking)
  • OpenAI gpt-4o-realtime  — voice assistant (WebSocket, push-to-talk)
  • Google Gemini 2.0 Flash — photorealistic selfie image generation
```

---

## Agent 1: Itinerary Builder (30 seconds)

The itinerary builder is a true tool-calling agent. It doesn't just generate text —
it calls tools in a loop to build a structured, conflict-free day-by-day schedule.

```
ITINERARY BUILDER AGENT
════════════════════════

  Input: List of saved trip ideas (activities, places, restaurants)
  Output: Optimized multi-day schedule with travel segments

  Model: GPT-4o-mini (temperature: 0.1 — deterministic)
  Max iterations: 10 tool-calling rounds
  Rate-limit retry: auto-retry on 429 (OpenAI throttle)

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  TOOL LOOP (up to 10 iterations)                             │
  │                                                              │
  │  Agent thinks → picks a tool → gets result → thinks again    │
  │                                                              │
  │  Available tools:                                            │
  │                                                              │
  │  ┌─────────────────────────┐                                 │
  │  │ get_activity_details    │ Fetch full info for an idea     │
  │  │ assign_activity_to_day  │ Place activity in a time slot   │
  │  │ get_all_travel_times    │ Distances between all places    │
  │  │ add_travel_segment      │ Insert transit between cities   │
  │  │ check_day_conflicts     │ Verify no time overlaps         │
  │  └─────────────────────────┘                                 │
  │                                                              │
  │  Strategy (from system prompt):                              │
  │  1. Group activities by geographic proximity                 │
  │  2. Optimize walking order within each day                   │
  │  3. Add travel segments for inter-city moves                 │
  │  4. Check for time conflicts before finalizing               │
  │  5. Post-processing fills empty slots with "Free Time"       │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### How the Agent Loop Works

```
  ┌──────────┐
  │  START   │  User clicks "Build Itinerary"
  └────┬─────┘
       │
       ▼
  ┌──────────────────────────────────────────────────────┐
  │  System prompt: "You are a travel itinerary planner. │
  │  Group by location. Optimize walking order.          │
  │  Use tools to assign activities to days."            │
  └────┬─────────────────────────────────────────────────┘
       │
       ▼
  ┌──────────────────────┐
  │  GPT-4o-mini thinks  │◄──────────────────────────┐
  │  "I need details on  │                           │
  │   activity #3"       │                           │
  └────┬─────────────────┘                           │
       │                                             │
       ▼                                             │
  ┌──────────────────────┐                           │
  │  TOOL CALL:          │                           │
  │  get_activity_details│                           │
  │  { id: "abc-123" }  │                           │
  └────┬─────────────────┘                           │
       │                                             │
       ▼                                             │
  ┌──────────────────────┐                           │
  │  Tool returns:       │                           │
  │  { name: "Senso-ji", │                           │
  │    lat: 35.71,       │                           │
  │    duration: "2h" }  │                           │
  └────┬─────────────────┘                           │
       │                                             │
       ▼                                             │
  ┌──────────────────────┐     ┌──────────────────┐  │
  │  GPT-4o-mini thinks  │────▶│ More tools needed?│──┘
  │  "Assign to Day 1    │     │ YES → loop back   │
  │   morning slot"      │     │ NO  → finish       │
  └──────────────────────┘     └────────┬──────────┘
                                        │ NO
                                        ▼
                               ┌──────────────────┐
                               │  POST-PROCESSING  │
                               │  Fill empty slots │
                               │  with "Free Time" │
                               │  Return schedule  │
                               └──────────────────┘
```

---

## Agent 2: Itinerary Chat Agent — Natural Language Editing (25 seconds)

Once an itinerary is built, users can modify it through conversation. The chat agent is
the most sophisticated agent in the system — it maintains session state, streams responses,
and requires user confirmation before touching the database.

```
ITINERARY CHAT AGENT
═════════════════════

  Input: Existing itinerary + user's natural language request
  Output: Modified itinerary draft — streamed back as it's computed

  Model: GPT-4o-mini (temperature: 0.3 — low variance for consistent edits)
  Max iterations: 10 tool-calling rounds per message
  Streaming: SSE (text chunks stream live as the agent thinks)
  Session TTL: 30 minutes (in-memory, keyed by tripId:userId)

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  KEY DIFFERENTIATORS FROM THE BUILDER AGENT:                 │
  │                                                              │
  │  • Multi-turn conversation — remembers prior messages        │
  │  • Works on an EXISTING itinerary, not a blank slate         │
  │  • Preview-then-confirm: database NEVER updated until        │
  │    user explicitly approves the proposed changes             │
  │  • Streams text chunks live via SSE as agent reasons         │
  │  • Detects conflicts and asks clarifying questions before     │
  │    calling any tools                                         │
  │  • Integrity validation after every mutation (reverts bad    │
  │    states automatically)                                     │
  │                                                              │
  │  8 TOOLS (5 shared with builder + 3 new edit-specific):      │
  │                                                              │
  │  ┌─────────────────────────────────────────────────────┐     │
  │  │ SHARED WITH BUILDER:                                │     │
  │  │  assign_activity_to_day  Place activity in a slot   │     │
  │  │  get_all_travel_times    Walking/transit/driving    │     │
  │  │  add_travel_segment      Inter-city transit block   │     │
  │  │  check_day_conflicts     Validate no overlaps       │     │
  │  │  get_activity_details    Fetch activity metadata    │     │
  │  │                                                     │     │
  │  │ NEW IN CHAT AGENT:                                  │     │
  │  │  move_activity           Move between days/slots    │     │
  │  │  remove_activity_from_day Delete (return to pool)  │     │
  │  │  swap_activities         Exchange two activities    │     │
  │  └─────────────────────────────────────────────────────┘     │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### The Preview-Then-Confirm Flow

```
  User types: "Move the Eiffel Tower to day 2"
       │
       ▼
  ┌──────────────────────────────────────────────────────────┐
  │  SESSION LOADS                                           │
  │  originalItinerary ← current DB state (frozen baseline) │
  │  draftItinerary    ← mutable copy (tools edit this)     │
  └────┬─────────────────────────────────────────────────────┘
       │
       ▼
  ┌──────────────────────┐
  │  GPT-4o-mini thinks  │◄────────────────────────┐
  │  "Day 2 afternoon    │                         │
  │  has Notre-Dame —    │                         │
  │  conflict detected"  │                         │
  └────┬─────────────────┘                         │
       │                                           │
       ▼  (no tool call yet — asks first)           │
  [SSE: text] "Moving Eiffel Tower to day 2        │
  afternoon would conflict with Notre-Dame.        │
  Would you like to swap them?"                    │
       │                                           │
       ▼                                           │
  User: "Swap them"                                │
       │                                           │
       ▼                                           │
  [SSE: tool_call] swap_activities(eiffel, notredame)
       │                                           │
       ▼                                           │
  Tool mutates draftItinerary → validates integrity│
       │                                           │
       ▼                                           │
  computeChanges() diffs original vs draft ────────┘
       │
       ▼
  [SSE: changes] [{ type: "moved", "Eiffel Tower: Day 1 → Day 2" }]
  [SSE: done]
       │
       ├── User clicks CONFIRM ──▶ draft saved to DB. original = draft.
       └── User clicks REJECT  ──▶ draft = original. No DB write.
```

---

## Agent 3: Decision Agent — "What Now?" (25 seconds)

When you're on the ground during your trip, this agent answers: "What should I do right now?"

```
DECISION AGENT ("What Now?")
════════════════════════════

  Input: Full trip context (location, weather, schedule, preferences, time)
  Output: 3-5 personalized activity suggestions with coordinates + distance

  Model: GPT-4o-mini
  Max iterations: 10 tool-calling rounds
  Timeout: 10 seconds (falls back to rule-based if AI is slow)

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  CONTEXT BUILDER (assembled before agent runs)               │
  │                                                              │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │  • Current GPS coordinates (lat/lng)                   │  │
  │  │  • Current weather + temperature                       │  │
  │  │  • Time of day + day of week                           │  │
  │  │  • Today's scheduled activities (from itinerary)       │  │
  │  │  • User preferences (dietary, energy level, budget)    │  │
  │  │  • Trip destination + dates                            │  │
  │  └────────────────────────────────────────────────────────┘  │
  │                                                              │
  │  TOOLS:                                                      │
  │                                                              │
  │  ┌──────────────────────────────┐                            │
  │  │ get_nearby_places            │ Google Places search       │
  │  │ get_travel_time              │ Distance/time to a place   │
  │  │ get_scheduled_activities     │ What's on today's plan     │
  │  │ get_food_recommendations     │ Dietary-aware restaurants  │
  │  │ get_itinerary_activity_details│ Full activity info        │
  │  └──────────────────────────────┘                            │
  │                                                              │
  │  FALLBACK: If AI takes >10s, rule-based engine kicks in      │
  │  (sorts nearby places by rating × proximity × category)      │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

---

## Voice Assistant — OpenAI Realtime API (20 seconds)

Not a chatbot. A real-time voice interface running over WebSocket:

```
VOICE ASSISTANT
═══════════════

  Model: gpt-4o-realtime-preview-2024-12-17
  Protocol: WebSocket (not REST — true bidirectional streaming)
  Interface: Push-to-talk button

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  Browser (mf-duringtrip)          OpenAI Realtime API        │
  │  ┌──────────────────┐            ┌──────────────────┐       │
  │  │                  │            │                  │       │
  │  │  User holds PTT  │──audio──▶ │  Transcribes     │       │
  │  │  button, speaks   │  chunks   │  Understands     │       │
  │  │                  │            │  Responds         │       │
  │  │  Audio playback  │◀─audio──  │  (voice + text)  │       │
  │  │  + transcript    │  stream   │                  │       │
  │  │                  │            │                  │       │
  │  └──────────────────┘            └──────────────────┘       │
  │                                                              │
  │  System prompt includes:                                     │
  │  • Trip name, destination, dates                             │
  │  • Today's itinerary                                         │
  │  • Current location (GPS)                                    │
  │  • User preferences                                          │
  │                                                              │
  │  Client-side tools:                                          │
  │  • get_current_location → browser Geolocation API            │
  │  • search_nearby_places → Google Places via client           │
  │                                                              │
  │  The assistant can answer:                                   │
  │  "Where's the nearest ramen place?"                          │
  │  "What's on my schedule this afternoon?"                     │
  │  "How do I get to Shibuya from here?"                        │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

---

## The AI Services Pipeline (30 seconds)

Beyond the agents, 10 specialized AI services handle everything from URL
enrichment to selfie generation:

```
AI SERVICES — THE FULL PICTURE
═══════════════════════════════

  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │  PRE-TRIP PHASE                                                 │
  │  ─────────────                                                  │
  │                                                                 │
  │  1. AI SUGGESTION GENERATION                                    │
  │     User describes trip → GPT generates 5-10 activity ideas     │
  │     Each idea enriched with Google Places (coords, photos,      │
  │     ratings, reviews) → streamed via SSE → saved to Supabase    │
  │                                                                 │
  │  2. AI AREA SEARCH (Draw-to-Discover)                           │
  │     User draws rectangle on map → natural language query         │
  │     → GPT finds 3 places within geographic bounds               │
  │     → reverse geocodes center, computes radius                  │
  │     → Google Places validates → results stream in               │
  │                                                                 │
  │  3. AI ENRICHMENT PIPELINE (3-stage)                            │
  │     Paste a TikTok/YouTube URL:                                 │
  │     ┌──────────┐   ┌──────────────┐   ┌────────────────┐       │
  │     │ URL      │──▶│ AI Enrichment│──▶│ Google Places  │       │
  │     │ Unfurl   │   │ (summary,    │   │ Match          │       │
  │     │ (meta,   │   │  tags,       │   │ (coords,       │       │
  │     │  title,  │   │  category,   │   │  photos,       │       │
  │     │  thumb)  │   │  cost/time)  │   │  ratings)      │       │
  │     └──────────┘   └──────────────┘   └────────────────┘       │
  │                                                                 │
  │  4. COST ENRICHMENT                                             │
  │     GPT estimates per-activity costs + daily transport           │
  │     Considers destination cost-of-living, categories,           │
  │     geographic spread between activities                        │
  │                                                                 │
  │  5. FLIGHT SEARCH + AI RANKING                                  │
  │     Amadeus API → real flight data                              │
  │     GPT resolves city names → IATA codes                        │
  │     LLM ranks top 3 flights per direction by itinerary fit      │
  │                                                                 │
  │  6. HOTEL RECOMMENDATION                                        │
  │     Weighted scoring: rating × proximity to activity centroid   │
  │     Haversine distance calculation                              │
  │     GPT generates human-readable recommendation reasons         │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │  ITINERARY PHASE                                                │
  │  ───────────────                                                │
  │                                                                 │
  │  7. TRAVEL GUIDE GENERATION                                     │
  │     Destination guides: etiquette, cultural tips, safety        │
  │     Activity spotlights: insider tips, best time, budget tips   │
  │     GPT-4o-mini, JSON structured output                         │
  │                                                                 │
  │  8. PHOTO GUIDE + SELFIE GENERATION                             │
  │     GPT generates: selfie tips, pose ideas, photo challenges,   │
  │     image prompts per activity                                  │
  │     Gemini 2.0 Flash generates photorealistic travel selfies    │
  │     from reference person photo + place photos                  │
  │     Pre-generated and cached as base64                          │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │  DURING-TRIP PHASE                                              │
  │  ─────────────────                                              │
  │                                                                 │
  │  9. FOOD RECOMMENDATIONS                                        │
  │     Google Places nearby search + dietary keyword matching       │
  │     Location-based cache invalidation (50km threshold)          │
  │     15-minute TTL for freshness                                 │
  │                                                                 │
  │  10. DECISION AGENT (see above — full agentic loop)             │
  │  11. VOICE ASSISTANT (see above — Realtime API)                 │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

---

## Streaming Architecture — Why the UI Never Freezes (20 seconds)

AI generation is slow. Our streaming architecture keeps the UI responsive:

```
THE PROBLEM: AI takes 5-30 seconds to generate results.
             Users stare at a spinner. They leave.

OUR SOLUTION: Dual-channel streaming (SSE + Supabase Realtime)


  ┌──────────┐         ┌──────────────┐         ┌──────────────┐
  │  Browser  │◄──SSE──│  Express API  │────────▶│   Supabase   │
  │  (React)  │        │  (server)    │  INSERT  │  (PostgreSQL)│
  │           │        │              │          │              │
  │           │◄───────│──────────────│──────────│  Realtime    │
  │           │  WS    │              │          │  Channel     │
  └──────────┘         └──────────────┘         └──────────────┘

  TWO CHANNELS, FULLY DECOUPLED:

  Channel 1: SSE (Server-Sent Events)
  ┌──────────────────────────────────────────────────────────┐
  │  Purpose: Progress updates ("Generating idea 3 of 8...")  │
  │  Lifetime: Open during generation, then closes            │
  │  If it drops: No data loss. Just lose progress bar.       │
  └──────────────────────────────────────────────────────────┘

  Channel 2: Supabase Realtime (WebSocket)
  ┌──────────────────────────────────────────────────────────┐
  │  Purpose: Actual data delivery (new activities, ideas)    │
  │  Lifetime: Always connected while app is open             │
  │  If SSE drops: Data STILL arrives via Realtime.           │
  │  Bonus: Other collaborators see new data instantly too.   │
  └──────────────────────────────────────────────────────────┘

  WHY THIS MATTERS:
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  User clicks "Generate Suggestions"                      │
  │       │                                                  │
  │       ▼                                                  │
  │  SSE opens → "Generating..." → "Idea 1 ready" → ...     │
  │       │                                                  │
  │       │  Meanwhile, server saves each idea to Supabase   │
  │       │                                                  │
  │       ▼                                                  │
  │  Supabase Realtime fires → React Query invalidates       │
  │  → UI renders new idea card with photo, rating, map pin  │
  │                                                          │
  │  Result: Ideas appear ONE BY ONE as they're generated.   │
  │  No waiting for all 8. No spinner. Progressive UI.       │
  │                                                          │
  │  And if the user's network hiccups mid-stream?           │
  │  SSE reconnects. Data was already saved to Supabase.     │
  │  Nothing lost.                                           │
  │                                                          │
  └──────────────────────────────────────────────────────────┘
```

---

## The User Journey — AI at Every Step (15 seconds)

AI isn't a feature. It's the foundation. Every phase of the trip has AI underneath:

```
USER JOURNEY THROUGH TRIPWEAVE
═══════════════════════════════

  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ DISCOVER │───▶│  PLAN    │───▶│  REFINE  │───▶│  TRAVEL  │
  └────┬────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
       │              │               │               │
       ▼              ▼               ▼               ▼
  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
  │AI Suggest│   │Itinerary │   │Chat Agent│   │Decision  │
  │Area Srch │   │Builder   │   │(agentic) │   │Agent     │
  │Enrichment│   │Agent     │   │Travel    │   │Voice     │
  │Pipeline  │   │(agentic) │   │Guide     │   │Assistant │
  │          │   │Cost      │   │Photo     │   │Food Recs │
  │          │   │Enrichment│   │Guide     │   │          │
  │          │   │Flights   │   │Selfie Gen│   │          │
  │          │   │Hotels    │   │(Gemini)  │   │          │
  └─────────┘   └──────────┘   └──────────┘   └──────────┘
       │              │               │               │
       ▼              ▼               ▼               ▼
    3 services     5 services      4 services      3 services
    GPT-4o-mini    GPT-4o-mini     GPT + Gemini    GPT + Realtime
                   + Amadeus API                   + Google Places

  Total: 14 AI-powered services across the entire trip lifecycle.
  Not one chatbot. An AI layer woven into every interaction.
```

---

## How We Built 13 AI Services in Hackathon Time (20 seconds)

This is the "10 people, output of 50" story from the AI side.

```
THE AI DEVELOPMENT MULTIPLIER
══════════════════════════════

  We didn't hand-code 13 AI services from scratch.
  We used AI coding agents (Kiro + Claude) to BUILD the AI features.

  AI building AI. That's the multiplier.

  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │  KIRO SPECS: 22 feature specifications written              │
  │                                                             │
  │  Each spec = requirements + design + implementation tasks   │
  │  AI coding agents execute the tasks autonomously            │
  │                                                             │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │  Spec: "AI Area Search"                             │    │
  │  │  → Requirements: draw on map, NL query, 3 results   │    │
  │  │  → Design: bounding box → reverse geocode → GPT     │    │
  │  │  → Tasks: controller, service, SSE, React hook      │    │
  │  │                                                     │    │
  │  │  Human: wrote the spec (10 min)                     │    │
  │  │  AI agent: implemented all tasks (20 min)           │    │
  │  │  Human: reviewed + tweaked (5 min)                  │    │
  │  │                                                     │    │
  │  │  Total: 35 min for a full AI-powered feature.       │    │
  │  │  Without AI agents: 3-4 hours minimum.              │    │
  │  └─────────────────────────────────────────────────────┘    │
  │                                                             │
  │  Multiply that across 22 specs × 10 developers:            │
  │                                                             │
  │  ┌─────────────────────────────────────────────────────┐    │
  │  │  Without AI agents:  22 features × 4 hrs = 88 hrs   │    │
  │  │  With AI agents:     22 features × 35 min = 13 hrs  │    │
  │  │                                                     │    │
  │  │  That's a 6-7x speedup on implementation alone.     │    │
  │  │  And because MFEs are isolated, all 10 devs         │    │
  │  │  run their AI agents in parallel. No conflicts.     │    │
  │  └─────────────────────────────────────────────────────┘    │
  │                                                             │
  │  AI agents building AI features, deployed independently     │
  │  via Module Federation + Zephyr Cloud.                      │
  │                                                             │
  │  That's how 10 people ship like 50.                         │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
```

### The Spec-Driven AI Pipeline

```
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │   HUMAN      │     │  AI CODING   │     │   HUMAN      │
  │   writes     │────▶│  AGENT       │────▶│   reviews    │
  │   spec       │     │  implements  │     │   + ships    │
  └──────────────┘     └──────────────┘     └──────────────┘
       10 min              20 min               5 min

  Specs written for AI features:
  ├── ai-area-search          (draw-to-discover)
  ├── ai-search-redesign      (suggestion UX)
  ├── progressive-trip-gen    (streaming itinerary)
  ├── ai-travel-guide         (destination guides)
  ├── amadeus-flight-search   (flight + AI ranking)
  ├── smart-hotel-recommend   (hotel scoring + GPT)
  ├── detailed-budget-tracker (cost enrichment)
  ├── parallel-idea-enrichment (3-stage pipeline)
  └── ... and 14 more

  Each spec → AI agent executes → human reviews → ship.
  Parallel across MFEs. No stepping on each other.
```

---

## External APIs Orchestrated (10 seconds)

AI doesn't work alone. It orchestrates real-world data sources:

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL API ORCHESTRATION                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ OpenAI       │  │ Google       │  │ Amadeus              │   │
│  │              │  │              │  │                      │   │
│  │ GPT-4o-mini  │  │ Places API   │  │ Flight Offers API    │   │
│  │ (agents,     │  │ (search,     │  │ (real airline data,  │   │
│  │  generation, │  │  details,    │  │  prices, schedules)  │   │
│  │  ranking,    │  │  photos,     │  │                      │   │
│  │  enrichment) │  │  reviews,    │  │ City → IATA via GPT  │   │
│  │              │  │  geocoding)  │  │ Ranking via GPT      │   │
│  │ Realtime API │  │              │  │                      │   │
│  │ (voice, WS)  │  │ Nearby Srch  │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │ Google       │  │ Supabase     │                              │
│  │ Gemini       │  │              │                              │
│  │              │  │ PostgreSQL   │                              │
│  │ 2.0 Flash    │  │ (storage)    │                              │
│  │ (selfie      │  │              │                              │
│  │  image gen)  │  │ Realtime     │                              │
│  │              │  │ (delivery)   │                              │
│  └──────────────┘  └──────────────┘                              │
│                                                                  │
│  AI is the orchestrator. It decides what to search, how to       │
│  rank results, and what to recommend — using real data, not      │
│  hallucinated answers.                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Live Demo Talking Points

When showing AI features, call out these moments:

1. "Watch what happens when I paste this TikTok link — the enrichment pipeline unfurls the URL, AI extracts the place name and category, then Google Places matches it with real coordinates, photos, and ratings. Three AI stages, one paste."

2. "I'm drawing a rectangle on the map and typing 'best street food' — the area search agent reverse-geocodes the bounds, asks GPT for places within that area, validates with Google Places, and streams results onto the map. Draw-to-discover."

3. "Now I click Build Itinerary — the itinerary builder agent runs a tool-calling loop. It's not generating text. It's calling `assign_activity_to_day`, checking for conflicts, adding travel segments between cities. Watch the schedule build itself."

4. "This is the voice assistant — OpenAI Realtime API over WebSocket. Push-to-talk. It knows my trip context, my schedule, my location. I can ask 'Where should I eat lunch?' and it uses client-side tools to search nearby places."

5. "Notice how suggestions appear one by one, not all at once. That's our dual-channel streaming — SSE for progress, Supabase Realtime for data. If the connection drops, nothing is lost. The data is already in the database."

6. "The selfie generation uses Gemini 2.0 Flash — it takes your profile photo and the destination, and generates a photorealistic travel selfie. AI image generation, not stock photos."

7. "Now that the itinerary is built, watch what happens when I type 'Move the Eiffel Tower to day 2'. The chat agent detects a conflict with Notre-Dame and asks if I want to swap them — no tool call yet, just clarifying. I say 'swap them' and now it calls swap_activities. Notice the changes panel shows exactly what moved — Eiffel Tower from Day 1 morning to Day 2 afternoon, Notre-Dame in the opposite direction. I can confirm to save or reject to revert. The database isn't touched until I confirm."

---

## The Numbers

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  14 AI-powered services                                      │
│  3 AI models (GPT-4o-mini, gpt-4o-realtime, Gemini 2.0)     │
│  3 true agentic loops (builder, chat editor, decision)       │
│  1 conversational editor (multi-turn, SSE, preview-confirm)  │
│  1 real-time voice interface (WebSocket, push-to-talk)       │
│  18 tools across 3 agents (5 builder + 8 chat + 5 decision)  │
│  3 external APIs orchestrated (OpenAI, Google, Amadeus)      │
│  2 streaming channels (SSE + Supabase Realtime)              │
│  3-stage enrichment pipeline (unfurl → AI → Places)          │
│  22 feature specs driving AI-assisted development            │
│                                                              │
│  Every phase of the trip — discover, plan, refine, travel —  │
│  has AI underneath it. Not bolted on. Woven in.              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Closing (10 seconds)

> "Most apps add a chatbot and call it AI. We built 14 AI services across
> 3 models — three agentic loops that call tools, a conversational editing
> agent that lets you reshape your itinerary in plain English, a real-time
> voice assistant, a streaming architecture that never freezes, and a selfie
> generator powered by Gemini. And we built it all in hackathon time because
> AI coding agents wrote the implementation while humans wrote the specs.
> 10 people. 22 specs. 14 AI services. That's the multiplier."
