# DuringTrip Development Instructions

This is a PWA for real-time travel assistance during trips. Before making changes, read the technical specification below.

---

# DuringTrip: Technical Handoff
## Live Travel Assistant - Developer Implementation Guide

**Status**: MVP Foundation Complete | **Next**: API Integration + AI Agent
**Team**: LGT | **Date**: January 7, 2026

---

## Overview

DuringTrip solves real-time travel crises when plans change mid-trip. When your Tokyo sushi reservation gets cancelled at 6pm, we surface 3 curated alternatives with one-tap booking in under 10 seconds. We're the only "during trip" agent—competitors focus on planning or navigation, not in-the-moment crisis resolution.

**Core Value**: Context-aware AI agent + real-time location + group coordination + offline capability

---

## User Stories

### Epic 1: Real-Time Crisis Resolution

**US-01**: As a traveler, I want to receive push notifications when my reservation is cancelled, so I don't waste time going to a closed restaurant
- **AC1**: Notification appears within 1 second of trigger event
- **AC2**: Notification includes 3 alternative restaurants with distance, rating, availability
- **AC3**: Works on iOS Safari, Android Chrome, Firefox macOS, desktop browsers
- **Status**: ✅ Push notification foundation complete (Service Worker notifications)
- **TODO**: Connect to booking cancellation webhook, integrate Google Places API

**US-02**: As a traveler, I want to see 3 curated restaurant alternatives based on my current location and preferences, so I can make a quick decision
- **AC1**: Results filtered by: walking distance (<15 min), open now, rating >4.0★
- **AC2**: Shows: name, distance, rating, hours, reservation availability
- **AC3**: Results load within 2 seconds
- **Status**: 🔨 In Progress (Google Places API integration needed)
- **TODO**: Implement filtering logic, UI component for restaurant cards

**US-03**: As a traveler, I want to book a table with one tap, so I can secure my new reservation in under 10 seconds
- **AC1**: Single tap on [Book Table] button reserves table
- **AC2**: Confirmation notification sent within 1 second
- **AC3**: Booking details stored in trip itinerary
- **Status**: ❌ Not Started (OpenTable/Resy API integration)
- **TODO**: API integration, booking confirmation UI, itinerary update

**US-04**: As a group member, I want my friends to be notified when I book a new place, so everyone knows the updated plan
- **AC1**: All trip members receive push notification when booking confirmed
- **AC2**: Notification includes restaurant name, time, address, directions link
- **AC3**: Group itinerary automatically updated
- **Status**: ❌ Not Started (Supabase realtime + group notifications)
- **TODO**: Supabase schema for trips/members, realtime listeners, group notification logic

### Epic 2: Group Coordination

**US-05**: As a traveler, I want to ask the AI for nearby recommendations, so I can discover places without manual searching
- **AC1**: Chat interface accepts natural language input ("temple nearby")
- **AC2**: AI responds with 2-3 filtered recommendations based on location, time, interests
- **AC3**: Response includes: name, distance, hours, description, [Add to Itinerary] button
- **Status**: ❌ Not Started (GPT-4/Claude integration)
- **TODO**: Chat UI, LLM integration, context building (location + time + preferences), prompt engineering

**US-06**: As a group member, I want to see my friends' locations on a shared map, so I know where everyone is when we split up
- **AC1**: Map shows all group members' last-known locations as pins
- **AC2**: Tapping pin shows: member name, last update time, current activity
- **AC3**: Auto-refreshes every 30 seconds
- **Status**: 🔨 In Progress (Map foundation complete, group location storage needed)
- **TODO**: Supabase location storage, group map UI, location update polling

**US-07**: As a traveler, I want to add places to my personal itinerary, so I can track what I'm doing independently from the group
- **AC1**: [Add to Itinerary] button on recommendations
- **AC2**: Itinerary shows: place name, time, status (upcoming/in progress/completed)
- **AC3**: Visible only to user unless shared with group
- **Status**: ❌ Not Started (Itinerary component + Supabase schema)
- **TODO**: Itinerary UI, Supabase itinerary_items table, CRUD operations

### Epic 3: Dynamic Replanning

**US-08**: As a traveler, I want the AI to suggest what to do when I finish an activity early, so I can maximize my time
- **AC1**: Chat accepts input like "I'm done early, what should I do?"
- **AC2**: AI suggests: nearby activities OR early meetup with group members
- **AC3**: Considers: current location, time available, group members' locations, interests
- **Status**: ❌ Not Started (AI agent + itinerary integration)
- **TODO**: LLM context builder (location + time diff + group status), recommendation logic

**US-09**: As a group member, I want to propose meeting up earlier, so we can coordinate last-minute plan changes
- **AC1**: User selects "Meet earlier" option from AI suggestions
- **AC2**: Proposed time sent to group members as push notification
- **AC3**: Group members can accept/decline, itineraries update on consensus
- **Status**: ❌ Not Started (Group coordination + itinerary sync)
- **TODO**: Group messaging, itinerary conflict resolution, realtime sync

**US-10**: As a traveler, I want itinerary updates to sync automatically, so I don't have to manually notify everyone
- **AC1**: Any itinerary change (add/remove/reschedule) syncs to Supabase
- **AC2**: Group members receive updates via realtime subscription
- **AC3**: UI updates within 1 second of change
- **Status**: ❌ Not Started (Supabase realtime subscriptions)
- **TODO**: Realtime listeners, optimistic UI updates, conflict handling

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (PWA)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   React 19   │  │  Mapbox GL   │  │  Service Worker  │  │
│  │  TypeScript  │  │  JS 3.17     │  │  (Notifications  │  │
│  │              │  │              │  │   + Offline)     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                  │                   │             │
│         └──────────────────┴───────────────────┘             │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌──────────────┐  ┌────────────────┐
│  Browser APIs   │  │  External    │  │   Supabase     │
│                 │  │  APIs        │  │   Database     │
│  - Geolocation  │  │              │  │                │
│  - Notification │  │  - Google    │  │  - trips       │
│  - Service      │  │    Places    │  │  - members     │
│    Worker       │  │  - OpenTable │  │  - locations   │
│                 │  │  - GPT-4/    │  │  - itinerary   │
│                 │  │    Claude    │  │                │
└─────────────────┘  └──────────────┘  └────────────────┘

Build: Vite 5.0 + vite-plugin-pwa
UI: shadcn/ui + Tailwind CSS 3.4
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript | Type-safe UI components |
| Build | Vite 5.0 | Fast dev server, optimized builds |
| UI | shadcn/ui + Tailwind CSS 3.4 | Accessible component library, utility CSS |
| Maps | Mapbox GL JS 3.17 | Interactive vector maps |
| PWA | vite-plugin-pwa + Service Worker | Offline, installable, notifications |
| Database | Supabase (PostgreSQL + Realtime) | Multi-user trips, location storage |
| APIs | Google Places, OpenTable/Resy | Restaurant data, bookings |
| AI | GPT-4 or Claude API | Conversational recommendations |
| Location | Browser Geolocation API | Real-time GPS tracking |

---

## Implementation Status

### ✅ Completed (Foundation)

**Real-Time Geolocation & Maps**
- Browser Geolocation API with `watchPosition` for continuous tracking
- Mapbox GL JS 3.17 with interactive map, markers, popups
- Offline map caching (30-day tile expiration) via Service Worker
- Custom hooks: `useLocation()` for geolocation state management

**Cross-Browser Push Notifications**
- Service Worker `registration.showNotification()` for Firefox macOS compatibility
- Permission management UI with status badges
- Notification actions (View, Close buttons)
- Graceful fallback to basic Notification API if Service Worker unavailable

**Progressive Web App (PWA)**
- Vite + vite-plugin-pwa for automatic Service Worker generation
- Install to home screen (iOS/Android/Desktop)
- Offline mode with static asset caching
- App manifest with icons, splash screen, theme color

**Modern UI Components**
- shadcn/ui components: Button, Card, Badge, Alert
- Tailwind CSS 3.4 with CSS variables for theming
- Accessible (WCAG 2.1 AA), mobile-optimized, dark mode ready

### 🔨 In Progress (For Demo)

**Live API Integration**
- Google Places API: Restaurant discovery, ratings, hours, photos
- OpenTable/Resy API: Booking availability and reservations
- Filter logic: open now, walking distance (<15 min), rating >4.0★

**Group Trip Database (Supabase)**
- Schema design: `trips`, `trip_members`, `locations`, `itinerary_items`
- Multi-user trips (e.g., "Tokyo Trip" with Sarah + Jake)
- Last-known location storage for group map view
- Shared itinerary with realtime sync

**AI Conversational Agent**
- GPT-4 or Claude API integration
- Context builder: user location, time, preferences, nearby POI, itinerary
- Prompt engineering for natural recommendations
- Chat UI with [Add to Itinerary] action buttons

**Dynamic Replanning Logic**
- Trigger detection: "I'm done early", skip activity, time conflict
- AI suggestion engine: nearby activities OR early meetup
- Itinerary update workflow with group notifications

### ❌ Out of Scope (MVP)

**Backend/APIs** (using mocked data for demo):
- Google Places integration (have API key, need implementation)
- OpenTable booking API (placeholder buttons for demo)
- Real-time location broadcasting (last-known location only)
- User authentication (Supabase ready, no login flow yet)

**AI Features** (placeholder for demo):
- LLM integration (have OpenAI key, need prompt engineering)
- Context-aware suggestions (hardcoded for demo)

**Known Limitations**:
- Mapbox token hardcoded in MapView.tsx (needs env var only)
- No unit tests (hackathon speed priority)
- Console logs excessive (debugging artifacts)
- Demo uses hardcoded Tokyo data

---

## Critical Files

```
client/mf-duringtrip/
├── public/
│   ├── sw.js                    # Service Worker: notifications, offline caching
│   └── manifest.json            # PWA manifest: icons, theme, install config
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui: Button, Card, Badge, Alert
│   │   ├── MapView.tsx          # Mapbox map, user location pin, group pins (TODO)
│   │   └── NotificationDemo.tsx # Push notification UI + permission management
│   ├── hooks/
│   │   ├── useLocation.ts       # Geolocation: watchPosition, error handling
│   │   └── useNotifications.ts  # Service Worker notifications, permission
│   ├── lib/
│   │   └── utils.ts             # cn() helper for Tailwind class merging
│   ├── styles/
│   │   ├── globals.css          # Tailwind directives + CSS variables
│   │   └── app.css              # Legacy styles (TODO: migrate to Tailwind)
│   ├── App.tsx                  # Main app component
│   └── index.tsx                # Entry point: React render + CSS imports
├── index.html                   # Root HTML (Vite entry)
├── vite.config.ts               # Vite + PWA plugin configuration
├── tailwind.config.js           # Tailwind theme + CSS variable mapping
└── package.json                 # Dependencies + scripts
```

---

## Key Technical Decisions

**1. Service Worker Notifications**
- **Why**: Basic `new Notification()` fails on Firefox macOS; Service Worker `registration.showNotification()` works cross-browser
- **Implementation**: Client sends message via `postMessage` to Service Worker, which calls `registration.showNotification()`
- **Impact**: Notifications work on all platforms, foundation for server push notifications

**2. Mapbox Safari ITP Workaround**
- **Why**: Safari Intelligent Tracking Prevention strips auth headers from third-party API requests
- **Implementation**: Added `transformRequest` in MapView.tsx to append access token to URL query params
- **Impact**: Maps work in Safari without CORS/auth errors

**3. Vite over Rsbuild**
- **Why**: Rsbuild + Module Federation caused infinite reload issues from CSS chunk loading failures
- **Impact**: Simpler build, native VITE_ env vars, faster HMR, no Module Federation complexity

**4. shadcn/ui Component Library**
- **Why**: Accessible Radix UI primitives + Tailwind, copy-paste model (no npm bloat), full customization
- **Impact**: Consistent design system, dark mode ready, WCAG 2.1 AA compliance

---

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use shadcn/ui components (no inline styles)
- Tailwind utility classes for styling
- Custom hooks for reusable logic (useLocation, useNotifications)

### Notifications
- **Always use Service Worker approach** via `useNotifications` hook
- Never use `new Notification()` directly (Firefox macOS incompatibility)
- Check `registration && registration.active` before posting messages

### Mapbox Integration
- Use environment variable `VITE_MAPBOX_TOKEN` (never hardcode)
- Include `transformRequest` for Safari compatibility
- Cache tiles via Service Worker for offline support

### State Management
- React hooks (useState, useEffect, useCallback) for local state
- Supabase realtime subscriptions for shared state (trips, locations, itinerary)
- Optimistic UI updates for better UX

### Environment Variables
- All env vars must use `VITE_` prefix (Vite requirement)
- Create `.env.local` (gitignored) for local development
- Required: `VITE_MAPBOX_TOKEN`
- Optional: `VITE_GOOGLE_PLACES_KEY`, `VITE_OPENAI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Quick Start

### Prerequisites
- Node.js 18+, npm
- Mapbox account and access token

### Setup
```bash
cd client/mf-duringtrip
npm install
npm run dev
# Opens at http://localhost:3003
```

### Environment Variables
Create `.env.local`:
```bash
VITE_MAPBOX_TOKEN=pk.eyJ1IjoibGd0LTIwMjYi...
VITE_GOOGLE_PLACES_KEY=AIzaSy...      # Optional (for live data)
VITE_OPENAI_API_KEY=sk-...            # Optional (for AI agent)
VITE_SUPABASE_URL=https://...         # Optional (for multi-user)
VITE_SUPABASE_ANON_KEY=eyJ...         # Optional (for multi-user)
```

### Build for Production
```bash
npm run build   # Output: dist/
npm run preview # Test production build locally
```

---

## Testing Checklist

### Must Have (Demo)
- [ ] Map loads with user location within 3 seconds
- [ ] Location accuracy indicator shows ±10m
- [ ] Push notification triggers and displays on all browsers
- [ ] Notification permission UI shows correct status (Enabled/Denied/Not set)
- [ ] PWA install prompt appears on eligible browsers
- [ ] Service Worker registers successfully (check DevTools → Application → Service Workers)

### In Progress (API Integration)
- [ ] Google Places API returns 3 restaurant alternatives
- [ ] Results filtered by: open now, <15 min walk, rating >4.0★
- [ ] [Book Table] button shows loading state → confirmation
- [ ] Group map shows 2+ users' locations
- [ ] AI chat responds to "temple nearby" with 2-3 recommendations

### Out of Scope (Post-MVP)
- [ ] Real OpenTable booking integration
- [ ] Real-time location broadcasting (WebSocket)
- [ ] User authentication flow
- [ ] Unit tests, E2E tests

---

*Last updated: January 7, 2026 | Ready for API integration*
