# Microfrontends → Single Frontend Migration Plan

## Current Architecture

```
client/
├── shell/ (port 2000) - Router + auth + navigation
├── mf-pretrip/ (port 3001) - Idea collection + trip planning (57 components)
├── mf-itinerary/ (port 3002) - Itinerary builder + chat (23 components)
├── mf-duringtrip/ (port 3003) - During-trip features + map (38 components)
├── shared-types/ - Shared TypeScript types
└── .playwright/ - Playwright CLI configs
```

## Target Architecture

```
client/
├── src/
│   ├── features/
│   │   ├── pretrip/      # Idea collection, map, ratings, filters
│   │   ├── itinerary/    # Itinerary display, AI chat, budget, guides
│   │   └── duringtrip/   # Active trip, location, decision agent
│   ├── components/       # Shared UI components
│   ├── hooks/            # Shared hooks
│   ├── lib/              # API, utils, Supabase
│   ├── contexts/         # Auth, modal contexts
│   ├── routes/           # TanStack Router route tree
│   └── App.tsx
├── shared-types/         # Kept as workspace package
├── tests/
│   ├── unit/             # Vitest unit tests
│   └── e2e/              # Playwright e2e tests
├── package.json          # Consolidated dependencies
├── rsbuild.config.ts     # Single build config (no Module Federation)
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

## Feature Inventory

### mf-pretrip (57 components)
- **Trip Management:** TripSelector, TripItem, TripMembers, TripSettings
- **Idea Collection:** IdeaCard, AddIdeaModal, IdeaDetailModal
- **Maps:** MapView, MapToolbar, Annotations
- **Ratings:** RatingHub, SwipeMode, GroupConsensus, MyRatingsGrid
- **Filters:** CategoryFilterBar, SignalFilterBar, DateRangePicker
- **Modals:** CreateTripModal, InviteLinkModal, TripMembersModal

### mf-itinerary (23 components)
- **Itinerary Display:** ItineraryPanel, ActivityCard, HotelCard, FlightCard
- **AI Chat:** ChatPanel, MessageBubble, ChangesPreview
- **Budget:** BudgetSummary
- **Guides:** PhotoGuideModal, TravelGuidePanel
- **Navigation:** DayTabs, SectionTabs, BottomBar

### mf-duringtrip (38 components)
- **Trip View:** ActiveTripView, TripsListView, TripCard
- **Itinerary:** (duplicated from mf-itinerary)
- **Chat:** ChatPanel, ChatInput, QuickActions, FoodCard, SuggestionCard
- **Location:** Location tracking, demo mode (to remove)
- **Mobile:** MobileTabBar, MobileBottomSheet, MobileItinerarySheet

### Duplicates to Consolidate (27 components)
- ChatPanel, MessageBubble, ChangesPreview
- ItineraryPanel, ActivityCard, HotelCard, FlightCard
- MapPanel, BudgetSummary, DayTabs, SectionTabs
- PhotoGuideModal, TravelGuidePanel, BottomBar, ActionsMenu
- useChatAgent, useItineraryDeletion, usePhotoGuide, useTravelGuide
- useAnnotations, usePlacesEnrichment, useTripMembers

## Testing Strategy

### Unit Tests (Vitest)
- Convert 6 existing Jest tests → Vitest
- Add tests for IdeaCard, ChatPanel, useChatAgent, useLocation
- Target: 80% coverage on shared hooks

### E2E Tests (Playwright)
- Full user flow: create trip → collect ideas → generate itinerary → during trip
- Keep existing Playwright CLI configs
- Keep `scripts/launch-chrome-beta.sh`

### Existing Tests to Convert
- `useCurrentTrip.test.ts`
- `useUserTrips.test.ts`
- `useUserTrips.integration.test.tsx`
- `TripDropdownComponents.test.tsx`
- `TripSelector.test.tsx`
- `TripItem.test.tsx`

## Timeline (2 Weeks)

### Week 1: Foundation + Pre-trip
| Day | Task |
|-----|------|
| 1 | Setup unified structure, package.json, rsbuild.config, TanStack Router, Vitest, Playwright |
| 2 | Copy mf-pretrip → features/pretrip, convert imports |
| 3 | Test pretrip features, convert Jest → Vitest (6 tests) |
| 4 | Integrate shell nav/auth into App.tsx, test auth flow |
| 5 | Delete mf-pretrip, commit |

### Week 2: Itinerary + During-trip + Consolidation
| Day | Task |
|-----|------|
| 6 | Copy mf-itinerary → features/itinerary, convert imports |
| 7 | Test itinerary features, add unit tests |
| 8 | Copy mf-duringtrip → features/duringtrip, remove demo mode |
| 9 | Test duringtrip features, add Playwright e2e flow |
| 10 | Consolidate duplicates, delete shell/mf-*, update README |

## Key Decisions

| Decision | Value |
|----------|-------|
| Port | 3000 (single dev server) |
| Router | TanStack Router (already used) |
| Test framework | Vitest + React Testing Library |
| E2E | Playwright |
| Package manager | pnpm |
| Shared-types | Keep as workspace package |
| Demo mode | Remove from duringtrip |
| Chrome script | Keep `launch-chrome-beta.sh` |
| Git strategy | Branch `refactor/single-frontend`, commit per phase |

## Backend Agents (Unchanged)

All 5 backend agents remain unchanged:

1. **AI Itinerary Builder Agent** - Pre-trip itinerary generation
2. **Itinerary Chat Agent** - Chat-based itinerary editing (SSE)
3. **During-Trip Chat Agent** - General trip Q&A
4. **Decision Agent** - "What Now?" suggestions
5. **Chat Agent** - Conversational during-trip assistant

Frontend API calls remain the same. Only Module Federation imports change to standard imports.

## Migration Steps

### Phase 1: Foundation
1. `git checkout -b refactor/single-frontend`
2. Create unified directory structure
3. Consolidate package.json (merge deps from shell + 3 MFEs)
4. Remove `@module-federation/rsbuild-plugin`
5. Create rsbuild.config.ts (single build, port 3000)
6. Create TanStack Router route tree
7. Add Vitest + Playwright dev dependencies
8. Create vitest.config.ts, playwright.config.ts

### Phase 2: Pre-trip Migration
1. Copy mf-pretrip/src/* → src/features/pretrip/
2. Convert `import("pretrip_main/App")` → direct imports
3. Copy shell components → src/components/
4. Integrate routes: `/pretrip`, `/join/:token`
5. Convert Jest tests → Vitest
6. Test: auth, create trip, idea collection, map, ratings
7. Delete mf-pretrip/

### Phase 3: Itinerary Migration
1. Copy mf-itinerary/src/* → src/features/itinerary/
2. Convert imports, remove Module Federation
3. Integrate route: `/itinerary`
4. Convert tests → Vitest
5. Test: itinerary display, AI chat, budget, guides
6. Delete mf-itinerary/

### Phase 4: During-trip Migration
1. Copy mf-duringtrip/src/* → src/features/duringtrip/
2. Merge routeTree.tsx into main routes/
3. Remove demo mode from location hooks
4. Convert imports, remove Module Federation
5. Integrate route: `/duringtrip`
6. Add Playwright e2e flow test
7. Test: location, chat, decision agent, mobile layout
8. Delete mf-duringtrip/

### Phase 5: Consolidation
1. Deduplicate shared components (chat, itinerary, maps)
2. Merge duplicate hooks into src/hooks/
3. Consolidate API services into src/lib/api.ts
4. Delete shell/
5. Update README.md
6. Final testing, cleanup

## Rollback Plan

If issues arise during migration:
```bash
git checkout main
git branch -D refactor/single-frontend
```

Or revert specific commits:
```bash
git revert <commit-hash>
```
