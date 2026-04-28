# Microfrontends → Single Frontend Migration Design

**Date:** 2026-04-27  
**Branch:** `refactor/single-frontend`  
**Status:** Approved

## Overview

Consolidate four separate packages (shell + 3 Module Federation microfrontends) into a single unified React app. The backend and all 5 AI agents are unchanged.

## Architecture

### Target Directory Structure

```
client/
└── src/
    ├── features/
    │   ├── pretrip/       # mf-pretrip content (temporary home, collapsed in Phase 5)
    │   ├── itinerary/     # mf-itinerary content
    │   └── duringtrip/    # mf-duringtrip content (no demo/ folder)
    ├── components/        # shell components + promoted shared components (Phase 5)
    ├── hooks/             # promoted shared hooks (Phase 5)
    ├── lib/               # supabase, api, queryKeys, sse, utils, etc.
    ├── contexts/
    │   ├── AuthContext.tsx   # migrated from shell
    │   └── ModalContext.tsx  # new — replaces window event bus
    ├── types/             # inlined from client/shared-types/ package
    └── routes/            # TanStack Router route tree
```

`features/` is temporary scaffolding. Phase 5 promotes duplicated hooks and components up to `src/hooks/` and `src/components/`.

## Key Decisions

| Area | Decision |
|------|----------|
| Port | 3000 (single dev server) |
| Router | TanStack Router (already in use) |
| Build tool | Rsbuild (no Module Federation plugin) |
| Package manager | pnpm |
| Test framework | Vitest + React Testing Library |
| E2E | Playwright (keep `launch-chrome-beta.sh`) |
| Git strategy | Branch `refactor/single-frontend`, commit per phase, merge to `main` at end |

## Changes from Original Plan

### 1. Demo mode — full removal (Phase 4)

Delete `mf-duringtrip/src/demo/` (`DemoBanner`, `DemoContext`, `DemoControlPanel`). Remove the `demo-access` localStorage grant from the shell's `RootLayout`. No replacement.

### 2. `shared-types` — inlined (Phase 1)

Move all types from `client/shared-types/` into `src/types/`. Delete the workspace package. Update all imports across the codebase.

### 3. Modal communication — `ModalContext` (Phase 2)

Replace `window.dispatchEvent(new CustomEvent("openTripModal", ...))` with a `ModalContext` that exposes `openModal(name, options)`.

- Shell's `ShellInviteLinkModal` and trip settings button migrate to `openModal()` calls
- Any component currently doing `window.addEventListener("openTripModal", ...)` switches to consuming `ModalContext`
- The `sessionStorage` pending-modal pattern in the shell can be removed — direct context calls replace it

### 4. Duplicate hooks — React Query version wins (Phase 5)

When consolidating into `src/hooks/`, the `mf-pretrip` implementation is canonical for all shared hooks:

- `useTripMembers` — pretrip version (React Query + `collaboration` lib)
- `useChatAgent`, `useAnnotations`, `usePhotoGuide`, `useTravelGuide`
- `useItineraryDeletion`, `usePlacesEnrichment`

The `useEffect`/raw-Supabase versions from itinerary and duringtrip are discarded.

## Phased Migration

### Phase 1 — Foundation
- `git checkout -b refactor/single-frontend`
- Create unified `client/src/` structure
- Consolidate `package.json` (merge deps from shell + 3 MFEs)
- Remove `@module-federation/rsbuild-plugin`
- Create `rsbuild.config.ts` (single build, port 3000)
- Inline `shared-types` → `src/types/`
- Add Vitest + Playwright dev dependencies
- Create `vitest.config.ts`, `playwright.config.ts`
- Create `ModalContext` stub wired into `App.tsx`

### Phase 2 — Pre-trip
- Copy `mf-pretrip/src/*` → `src/features/pretrip/`
- Convert Module Federation imports to direct imports
- Wire `ModalContext`: migrate all `window.dispatchEvent("openTripModal")` callers to `openModal()`
- Copy shell nav/auth components → `src/components/`
- Integrate routes: `/pretrip`, `/join/:token`
- Convert 6 Jest tests → Vitest
- Test: auth, create trip, idea collection, map, ratings
- Delete `mf-pretrip/`

### Phase 3 — Itinerary
- Copy `mf-itinerary/src/*` → `src/features/itinerary/`
- Convert Module Federation imports to direct imports
- Integrate route: `/itinerary`
- Test: itinerary display, AI chat, budget, guides
- Delete `mf-itinerary/`

### Phase 4 — During-trip
- Copy `mf-duringtrip/src/*` → `src/features/duringtrip/`
- Delete `demo/` folder (`DemoBanner`, `DemoContext`, `DemoControlPanel`)
- Remove `demo-access` localStorage logic from shell's `RootLayout`
- Merge `routeTree.tsx` into main routes
- Convert Module Federation imports to direct imports
- Integrate route: `/duringtrip`
- Add Playwright e2e flow: create trip → collect ideas → generate itinerary → during trip
- Test: location, chat, decision agent, mobile layout
- Delete `mf-duringtrip/`

### Phase 5 — Consolidation
- Promote shared hooks to `src/hooks/` (React Query versions from pretrip)
- Deduplicate components → `src/components/`
- Consolidate lib files (`api.ts`, `supabase.ts`, `queryKeys.ts`, etc.)
- Delete `shell/`
- Update README

## Testing Strategy

**Unit tests (Vitest)**
- Convert 6 existing Jest tests (from `mf-pretrip`) to Vitest in Phase 2
- Add tests for `useChatAgent` and `useLocation` in Phases 3–4
- 80% coverage target on shared hooks (measured after Phase 5 consolidation)

**E2E tests (Playwright)**
- One full user flow added in Phase 4: create trip → collect ideas → generate itinerary → during trip
- Keep `scripts/launch-chrome-beta.sh` and existing Playwright CLI configs from `client/.playwright/`

## Backend (Unchanged)

All 5 AI agents remain unchanged. Frontend API calls stay the same — only Module Federation imports change to standard imports.

1. AI Itinerary Builder Agent
2. Itinerary Chat Agent (SSE)
3. During-Trip Chat Agent
4. Decision Agent
5. Chat Agent

## Rollback

```bash
git checkout main
git branch -D refactor/single-frontend
```
