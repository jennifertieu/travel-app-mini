# PRD: During-Trip Demo Mode

## Overview

A demo mode for the `mf-duringtrip` microfrontend that showcases all features and flows either autonomously (AI-driven via Playwright) or manually (user-driven with simulated trip state). The goal is to demonstrate the full during-trip experience without requiring an actual trip, real GPS location, or live OpenAI API keys.

***ONLY ALLOWED TO BE USED FOR WHITELISTED USERS ON THE TEAM TO PRESERVE CREDIT USAGE
---

## Problem

- Demoing the during-trip experience requires being on an actual trip with real itinerary data, GPS location, and time-of-day alignment.
- The voice assistant requires OpenAI Realtime API credentials and a microphone.
- Stakeholders, investors, and new team members need to see the full product flow quickly.
- QA needs a repeatable way to exercise all interactions.

---

## Goals

1. **AI Demo Mode**: Playwright-driven automated walkthrough of every feature, narrated with on-screen captions.
2. **Manual Demo Mode**: User manually interacts with the app using simulated/overridden trip context (fake time, fake GPS, pre-loaded itinerary).
3. Both modes should work without external API dependencies (OpenAI, Google Places).

---

## Modes

### Mode 1: AI Demo (Playwright Automated)

An automated script that drives the browser through every flow with realistic timing and on-screen annotations explaining what's happening.

#### Demo Script Sequence

**Act 1 — First Glance (Mobile, ~30s)**
1. Open app at mobile viewport (390x844)
2. Navigate to `/duringtrip` with demo trip loaded
3. Caption: "You've just arrived in Seoul. Here's your trip at a glance."
4. Show bottom sheet peek: current activity + next stop
5. Tap Navigate button — show Google Maps intent (intercept, don't actually open)
6. Caption: "One tap to get directions to your current activity."

**Act 2 — Explore the Itinerary (~45s)**
7. Tap/swipe bottom sheet handle to expand
8. Caption: "Swipe up to see your full day."
9. Scroll through morning/afternoon/evening sections
10. Tap Day 2 tab
11. Caption: "Switch between days to plan ahead."
12. Tap Day 3 tab, then back to Day 1
13. Tap an activity card (e.g., "Gyeongbokgung Palace")
14. Caption: "Tap any activity for details and navigation."
15. Show ActivityDetailModal — hero image, description, category pills
16. Tap Navigate in modal
17. Close modal (tap X)

**Act 3 — Manage Your Day (Desktop, ~30s)**
18. Resize to desktop viewport (1280x800)
19. Caption: "On desktop, you get a split view with the map."
20. Show the 50/50 itinerary + map layout
21. Tap "Select" to enter selection mode
22. Select 2-3 activities
23. Caption: "Select activities to manage them in bulk."
24. Tap "Select All", then "Done"

**Act 4 — Voice Assistant (~45s)**
25. Resize back to mobile
26. Tap voice assistant floating button
27. Caption: "Meet your AI travel companion."
28. Show panel open with avatar in idle state
29. Simulate hold-to-speak (trigger listening state)
30. Caption: "Hold to ask anything about your trip."
31. Simulate transcript: "Where can I find good street food nearby?"
32. Show avatar transition: listening → processing → speaking
33. Simulate assistant response with mock transcript
34. Caption: "Get real-time recommendations powered by AI."
35. Tap "Show transcript" to reveal conversation history
36. Close voice assistant panel

**Act 5 — Map Exploration (~20s)**
37. Pan/zoom the map to show annotation overlays
38. Tap a map marker to show popup
39. Caption: "Your itinerary is plotted on the map with smart annotations."
40. Zoom out to show the full trip area

**Finale (~10s)**
41. Return to mobile peek view
42. Caption: "TripWeave — your AI travel companion, from planning to exploring."

#### Technical Approach

- **Runner**: Playwright test file (`demo/ai-demo.spec.ts`) executed via `npx playwright test`
- **Captions**: Inject a fixed-position overlay div with animated text (fade in/out)
- **Mock data**: Use a dedicated demo trip with rich itinerary (photos, coordinates, descriptions)
- **Voice simulation**: Directly manipulate VoiceAssistantContext state via `window.__DEMO_HOOKS__` exposed in demo mode
- **Timing**: Use `page.waitForTimeout()` between actions for natural pacing
- **Recording**: Optionally capture with `--video` flag for shareable MP4

---

### Mode 2: Manual Demo (Interactive)

User launches the app in demo mode and manually performs all actions with simulated trip context overrides.

#### Simulated Overrides

| Override | Purpose | Implementation |
|----------|---------|----------------|
| **Time of day** | Control which activity is "current" | `window.__DEMO_TIME__` override in `getCurrentAndNextActivity()` |
| **GPS location** | Simulate being in Seoul | `window.__DEMO_LOCATION__` override in `useLocation` hook |
| **Trip data** | Pre-loaded rich itinerary | Demo trip seeded in Supabase with full coordinates + images |
| **Voice responses** | Mock AI responses without OpenAI | `window.__DEMO_VOICE__` flag triggers canned responses from local JSON |
| **Places enrichment** | Photos/descriptions without API | Bundled enrichment data in `demo/fixtures/enrichment.json` |

#### Activation

- URL parameter: `?demo=true` or `?demo=manual`
- Activates demo mode banner at top: "DEMO MODE — Simulating trip to Seoul, Day 1, 10:30 AM"
- Shows a floating demo control panel (bottom-left, draggable):
  - **Time slider**: Scrub through the day (6 AM → 12 AM)
  - **Day picker**: Jump between days
  - **Location picker**: Dropdown of key Seoul locations (Gyeongbokgung, Myeongdong, Itaewon, etc.)
  - **Reset**: Return to default demo state

#### Demo Control Panel UI

```
+------------------------------------------+
|  DEMO CONTROLS                      [-]  |
|  Day: [< Day 1 >]                        |
|  Time: [======|====] 10:30 AM            |
|  Location: [Gyeongbokgung Palace  v]     |
|  Voice: [x] Use mock responses           |
|  [Reset]                                 |
+------------------------------------------+
```

#### Manual Flow Checklist

The demo control panel includes a collapsible checklist so the presenter can track which flows they've shown:

- [ ] View bottom sheet peek (current + next activity)
- [ ] Tap Navigate button
- [ ] Expand bottom sheet (swipe/tap)
- [ ] Switch days via DayTabs
- [ ] Tap activity → view detail modal
- [ ] Tap Navigate in modal
- [ ] Close modal
- [ ] Use voice assistant (hold to speak)
- [ ] View voice transcript
- [ ] Zoom/pan map
- [ ] Tap map marker
- [ ] Desktop: enter selection mode
- [ ] Desktop: select activities + select all
- [ ] Scrub time to change current activity

---

## Data Requirements

### Demo Trip Seed

A pre-built trip with:
- **Destination**: Seoul, South Korea
- **Duration**: 5 days (Feb 24 - Feb 28)
- **Activities per day**: 4-6, covering morning/afternoon/evening
- **Every activity must have**:
  - `latitude` and `longitude` (for map markers)
  - `location` object with `name` and `address`
  - `category` (restaurant, museum, landmark, etc.)
  - `duration_minutes`
  - `image_url` (hosted or bundled)
  - `description` and `summary`
  - At least 2 activities per day marked `must_capture: true`

### Demo Annotations

Pre-seeded annotations for the map:
- 1 polygon: "Myeongdong Shopping District"
- 1 path: "Cheonggyecheon Stream Walk"
- 1 rectangle: "Itaewon Food Area"

### Mock Voice Responses

JSON file with canned Q&A pairs:
```json
[
  {
    "trigger": "street food|food nearby|eat",
    "userTranscript": "Where can I find good street food nearby?",
    "response": "There are several great street food options near you! Gwangjang Market is famous for bindaetteok and mayak gimbap. It's about a 10-minute walk from your current location.",
    "tools": ["search_nearby_places"]
  },
  {
    "trigger": "weather|rain|cold",
    "userTranscript": "What's the weather like today?",
    "response": "It's currently 8 degrees Celsius in Seoul with clear skies. Perfect weather for exploring! You might want a light jacket for the evening.",
    "tools": []
  }
]
```

---

## Architecture

### New Files

```
client/mf-duringtrip/
  src/
    demo/
      DemoProvider.tsx          # Context provider for demo state
      DemoControlPanel.tsx      # Floating control panel UI
      DemoBanner.tsx            # Top banner showing demo status
      demo-hooks.ts             # window.__DEMO_* exposure + overrides
      fixtures/
        demo-trip.json          # Full itinerary with coordinates
        enrichment.json         # Pre-loaded place enrichment data
        voice-responses.json    # Canned voice assistant responses
        annotations.json        # Map annotation fixtures
  demo/
    ai-demo.spec.ts             # Playwright automated demo script
    captions.ts                 # Caption text + timing definitions
    demo-helpers.ts             # Shared utilities for demo scripts
    playwright.config.ts        # Demo-specific Playwright config
```

### Modified Files

| File | Change |
|------|--------|
| `ActiveTripView.tsx` | Wrap with `DemoProvider` when `?demo` param present |
| `MobileItinerarySheet.tsx` | Use `__DEMO_TIME__` override in `getCurrentAndNextActivity()` |
| `useLocation.ts` | Return `__DEMO_LOCATION__` when in demo mode |
| `useVoiceAssistant.ts` | Route to mock responses when `__DEMO_VOICE__` is true |
| `usePlacesEnrichment.ts` | Return bundled fixtures when in demo mode |
| `useAnnotations.ts` | Return fixture annotations when in demo mode |

### Demo Mode Detection

```typescript
// src/demo/demo-hooks.ts
export function isDemoMode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('demo');
}

export function getDemoMode(): 'ai' | 'manual' | false {
  const params = new URLSearchParams(window.location.search);
  const val = params.get('demo');
  if (val === 'ai') return 'ai';
  if (val === 'true' || val === 'manual') return 'manual';
  return false;
}
```

---

## Implementation Phases

### Phase 1: Demo Data & Fixtures
- Create demo trip JSON with full coordinates and images for Seoul
- Create enrichment fixture data
- Create annotation fixtures
- Create mock voice response pairs
- Seed demo trip into Supabase (or load from fixtures)

### Phase 2: Manual Demo Mode
- Implement `DemoProvider` context with time/location/voice overrides
- Build `DemoControlPanel` UI (time slider, day picker, location dropdown)
- Build `DemoBanner` showing current demo state
- Wire overrides into existing hooks (`useLocation`, `usePlacesEnrichment`, `useAnnotations`, `getCurrentAndNextActivity`)
- Add mock voice response routing in `useVoiceAssistant`
- Test all manual flows with overrides

### Phase 3: AI Demo Mode (Playwright)
- Write Playwright demo script with all 5 acts
- Implement caption overlay injection system
- Add viewport resize transitions
- Add voice state simulation via `window.__DEMO_HOOKS__`
- Test full automated run end-to-end
- Add `--video` recording support

### Phase 4: Polish
- Smooth caption animations (typewriter effect or fade)
- Demo control panel: drag-to-reposition, collapse/expand
- Flow checklist persistence (localStorage)
- Demo mode keyboard shortcuts (e.g., `D` to toggle controls, `T` to advance time)
- Error boundary for demo mode (graceful fallback if fixtures missing)

---

## Success Criteria

- [ ] `?demo=manual` loads the app with simulated Seoul trip, fake GPS, and controllable time
- [ ] Time slider changes the "current activity" in real-time on the bottom sheet
- [ ] Location dropdown updates the GPS position used by voice assistant tools
- [ ] Voice assistant works with canned responses (no OpenAI key needed)
- [ ] Map shows all activity markers and annotations with demo data
- [ ] `npx playwright test demo/ai-demo.spec.ts` runs the full automated walkthrough without errors
- [ ] Automated demo completes in under 3 minutes
- [ ] Video recording produces a shareable MP4
- [ ] No demo code is included in production builds (tree-shaken or lazy-loaded behind `?demo` check)

---

## Open Questions

1. **Demo trip source**: Should the demo trip be hardcoded in fixtures or fetched from a dedicated Supabase row? Fixtures are simpler and work offline; Supabase row is more realistic.
2. **Voice audio**: Should the AI demo actually play audio, or just show visual state transitions? Audio adds realism but requires TTS fixtures.
3. **Recording format**: Playwright supports WebM video. Should we also generate a GIF for lightweight sharing?
4. **Production gating**: Should `?demo` be available in production, or only in development/staging builds?
