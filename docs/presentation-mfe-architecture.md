# TripWeave — Module Federation & Zephyr Cloud
## Hackathon Presentation (2.5 minutes)

---

## Opening (15 seconds)

> "We're a team of 10. But we shipped like a team of 50. The secret: 
> Module Federation splits our app into 4 independent microfrontends, 
> each one its own isolated codebase. That means 10 developers — each 
> paired with AI coding agents — can all build in parallel with zero 
> merge conflicts and deploy independently to the edge with Zephyr Cloud."

---

## The Problem (20 seconds)

Traditional monolithic SPAs hit a wall when multiple teams (or features) grow:

```
MONOLITH SPA
┌─────────────────────────────────────────────┐
│                                             │
│   Auth + Planning + Itinerary + Live Map    │
│   + Voice + Routing + 47 components...      │
│                                             │
│   ONE build. ONE deploy. ONE failure point. │
│                                             │
│   Change the itinerary page?                │
│   Rebuild and redeploy EVERYTHING.          │
│   Break the map? The whole app is down.     │
│                                             │
└─────────────────────────────────────────────┘

  Build time: 3+ minutes
  Deploy risk: HIGH (any change = full redeploy)
  Team velocity: BLOCKED (merge conflicts, shared CI)
```

---

## Our Architecture (30 seconds)

We split TripWeave into 4 independently built, deployed, and versioned apps:

```
                        ┌─────────────────────────────────────────┐
                        │          tripweave.app                  │
                        │        Zephyr Cloud Edge                │
                        └──────────────┬──────────────────────────┘
                                       │
                        ┌──────────────▼──────────────────────────┐
                        │         SHELL (Host App)                │
                        │                                         │
                        │  • TanStack Router                      │
                        │  • Auth (Supabase + Google OAuth)       │
                        │  • Global nav, trip switcher            │
                        │  • Lazy-loads remotes at runtime        │
                        │                                         │
                        │  Port 2000 (dev) │ shell.ze.zephyr...   │
                        └───┬─────────┬────────────┬──────────────┘
                            │         │            │
              ┌─────────────▼──┐  ┌───▼────────┐  ┌▼──────────────┐
              │  mf-pretrip    │  │mf-itinerary│  │ mf-duringtrip │
              │                │  │            │  │               │
              │ Trip planning  │  │ Day-by-day │  │ Live map      │
              │ AI discovery   │  │ schedule   │  │ Voice assist  │
              │ Map collab     │  │ Map panel  │  │ Geolocation   │
              │ Drawing tools  │  │ Photo guide│  │ Food recs     │
              │ Voting/react   │  │ Budget     │  │ Notifications │
              │ TikTok paste   │  │ Flights    │  │               │
              │                │  │ Chat panel │  │               │
              │ Port 3001      │  │ Port 3002  │  │ Port 3003     │
              └────────────────┘  └────────────┘  └───────────────┘

              Each MFE:
              ✓ Own repo-like independence (own package.json, own build)
              ✓ Own dev server (run just what you're working on)
              ✓ Deploys independently to Zephyr edge
              ✓ Shares React 19 + React Query as singletons (no duplication)
```

---

## How It Works — Runtime Composition (30 seconds)

The shell doesn't bundle the MFEs at build time. It fetches them at runtime:

```
BUILD TIME (each MFE builds independently)
═══════════════════════════════════════════

  mf-pretrip ──build──▶ remoteEntry.js ──deploy──▶ Zephyr Edge CDN
  mf-itinerary ──build──▶ remoteEntry.js ──deploy──▶ Zephyr Edge CDN
  mf-duringtrip ──build──▶ remoteEntry.js ──deploy──▶ Zephyr Edge CDN
  shell ──build──▶ index.html ──deploy──▶ Zephyr Edge CDN


RUNTIME (user visits tripweave.app)
═══════════════════════════════════

  Browser                    Zephyr Edge
  ┌──────┐                   ┌──────────┐
  │      │──GET /──────────▶│  shell    │
  │      │◀─── index.html───│          │
  │      │                   └──────────┘
  │      │
  │      │  User clicks "Pre-Trip" tab
  │      │                   ┌──────────┐
  │      │──GET manifest───▶│ mf_pretrip│
  │      │◀─ remoteEntry.js─│  (edge)  │
  │      │                   └──────────┘
  │      │
  │      │  React.lazy() resolves
  │      │  Component renders in shell's <Outlet>
  │      │  Shared React singleton — no duplicate React!
  └──────┘

  Total JS for shell: ~180KB
  Each MFE loaded on-demand: ~100-200KB
  Shared deps (React, React Query): loaded ONCE
```

The shell config tells Module Federation where to find each remote:

```typescript
// shell/rsbuild.config.ts
remotes: {
  pretrip_main:    "mf_pretrip@http://localhost:3001/mf-manifest.json",
  itinerary_main:  "mf_itinerary@http://localhost:3002/mf-manifest.json",
  duringtrip_main: "mf_duringtrip@http://localhost:3003/mf-manifest.json",
}
```

And the shell lazy-loads them with standard React patterns:

```typescript
// shell/src/App.tsx
const PretripApp   = lazy(() => import("pretrip_main/App"));
const ItineraryApp = lazy(() => import("itinerary_main/App"));
const DuringtripApp = lazy(() => import("duringtrip_main/App"));

// In routes:
<Suspense fallback={<Loading />}>
  <PretripApp />    {/* ← fetched from Zephyr edge at runtime */}
</Suspense>
```

---

## What Each MFE Exposes (15 seconds)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODULE FEDERATION EXPORTS                     │
├──────────────┬──────────────────────────────────────────────────┤
│ mf_pretrip   │ ./App            (full pre-trip experience)      │
│              │ ./place-search   (reusable place search logic)   │
│              │ ./unfurl         (URL unfurling utility)          │
│              │ ./IdeaDetailModal (shared modal component)        │
├──────────────┼──────────────────────────────────────────────────┤
│ mf_itinerary │ ./App            (full itinerary experience)     │
├──────────────┼──────────────────────────────────────────────────┤
│ mf_duringtrip│ ./App            (full during-trip experience)   │
├──────────────┼──────────────────────────────────────────────────┤
│ shell        │ Consumes all three remotes                       │
│              │ Provides: Auth, routing, nav, trip context        │
└──────────────┴──────────────────────────────────────────────────┘

Shared singletons (loaded once, used by all):
  • react@19        (singleton: true, eager in shell)
  • react-dom@19    (singleton: true, eager in shell)
  • @tanstack/react-router (singleton in shell)
```

---

## Zephyr Cloud — The Platform That Makes This Possible (40 seconds)

Zephyr Cloud is a Module Federation platform purpose-built for microfrontend 
orchestration. It's cloud agnostic, framework agnostic, and bundler agnostic.
Here's what it gives us that no other deployment platform does:

```
WHAT ZEPHYR CLOUD DOES
═══════════════════════

  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  │  1. IMMUTABLE VERSIONING                                     │
  │     Every build = immutable version with its own preview URL │
  │     Nothing is overwritten. Every version lives forever.     │
  │     Test any version in a real environment before promoting. │
  │                                                              │
  │  2. INSTANT ROLLBACKS                                        │
  │     Old versions stay running on the edge alongside new ones.│
  │     Rollback = just switching a routing pointer.             │
  │     No rebuild. No redeploy. Seconds, not minutes.           │
  │     "Both versions are already running — we just switch      │
  │      which one gets traffic."                                │
  │                                                              │
  │  3. INTELLIGENT DEPENDENCY RESOLUTION                        │
  │     Zephyr auto-resolves which version of each MFE to load. │
  │     Feature branches get matching feature branch versions.   │
  │     CI builds get CI versions. Local dev gets local builds.  │
  │     No hardcoded remote URLs. No manual version coordination.│
  │                                                              │
  │  4. CONTENT-ADDRESSED STORAGE                                │
  │     Duplicate assets across MFEs are deduplicated.           │
  │     If mf-pretrip and mf-itinerary share the same chunk,    │
  │     it's stored once and served from edge cache.             │
  │                                                              │
  │  5. CLOUD AGNOSTIC                                           │
  │     Deploy to Cloudflare, AWS, Fastly, Akamai, or K8s.      │
  │     Switch providers without changing a single line of code. │
  │     No vendor lock-in. We chose Cloudflare Workers + KV.     │
  │                                                              │
  │  6. BUNDLER AGNOSTIC                                         │
  │     Works with Webpack, Vite, Rspack, Rsbuild, Rollup,      │
  │     Rolldown, Parcel, and Re.Pack (React Native).            │
  │     We use Rsbuild (Rust-powered, zero-config).              │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

### How Zephyr Deploys TripWeave

```
DEVELOPER WORKFLOW
══════════════════

  git push (or local build)
       │
       ▼
  ┌──────────────────────────────────────────────────────────┐
  │  Rsbuild + Module Federation + Zephyr Plugin             │
  │                                                          │
  │  1. Builds the MFE (Rust-powered Rspack — fast)          │
  │  2. Zephyr plugin intercepts the output                  │
  │  3. Uploads assets to global edge network                │
  │  4. Registers immutable version in Zephyr's registry     │
  │  5. Content-addressed dedup eliminates shared chunks     │
  │  6. Returns a unique per-build preview URL               │
  │                                                          │
  │  Deployment time: sub-second (10ms asset propagation)    │
  │                                                          │
  │  Result:                                                 │
  │  https://thomas-nguyen-368-shell-travel-app-lgt-champs   │
  │         -59141bba9-ze.zephyrcloud.app                    │
  └──────────────────────────────────────────────────────────┘
```

### Tags, Environments & Smart Versioning

```
ZEPHYR VERSIONING SYSTEM
════════════════════════

  Every build gets a SemVer version (MAJOR.MINOR.PATCH).
  Tags group versions by rules. Environments serve traffic.

  ┌─────────────────────────────────────────────────────────┐
  │  TAGS (auto-created from branch names)                  │
  │                                                         │
  │  main branch    → "latest" tag (auto)                   │
  │  develop branch → "next" tag (auto)                     │
  │  feature/map    → "feature-map" tag (auto)              │
  │                                                         │
  │  Custom rules on dashboard:                             │
  │  Tag "production" = branch:main + is-CI:true            │
  │  Tag "staging"    = branch:develop                      │
  │  Tag "thomas-dev" = username:thomas + branch:*           │
  │                                                         │
  │  ENVIRONMENTS (serve traffic on custom domains)         │
  │                                                         │
  │  "production" environment                               │
  │    → linked to "production" tag                         │
  │    → custom domain: tripweave.app                       │
  │    → auto-updates when tag gets new version             │
  │                                                         │
  │  Every push to main → new version → tag auto-updates    │
  │  → tripweave.app serves latest → zero-downtime          │
  └─────────────────────────────────────────────────────────┘
```

### Zephyr's Dependency Resolution (Why This Is Huge for MFEs)

```
THE PROBLEM WITHOUT ZEPHYR:
═══════════════════════════

  // shell/rsbuild.config.ts — hardcoded URLs 😬
  remotes: {
    pretrip: "mf_pretrip@https://cdn.example.com/v47/remoteEntry.js",
    //                                          ^^^
    //                   Manual version bump every time pretrip deploys.
    //                   Miss one? Shell loads stale code. Or crashes.
  }


WITH ZEPHYR — AUTOMATIC RESOLUTION:
════════════════════════════════════

  // shell/package.json
  "zephyr:dependencies": {
    "pretrip_main":    "mf_pretrip@*",      // latest version
    "itinerary_main":  "mf_itinerary@*",    // latest version
    "duringtrip_main": "mf_duringtrip@*"    // latest version
  }

  Zephyr resolves the right version at build time:
  • On main branch → gets production versions
  • On feature branch → gets matching feature branch versions
  • In CI → gets CI-built versions
  • Local dev → gets your local builds

  No hardcoded URLs. No manual coordination.
  Deploy mf_pretrip independently → shell auto-resolves it.
```

### Instant Rollbacks — The Safety Net

```
SOMETHING BROKE IN PRODUCTION?
══════════════════════════════

  Traditional deploy:
  ┌──────────────────────────────────────────────────┐
  │  1. Revert git commit                            │
  │  2. Wait for CI to rebuild (2-5 min)             │
  │  3. Wait for deploy to propagate (1-3 min)       │
  │  4. Users affected for 3-8 minutes               │
  └──────────────────────────────────────────────────┘

  Zephyr rollback:
  ┌──────────────────────────────────────────────────┐
  │  1. Click "Rollback" on dashboard                │
  │  2. Zephyr switches routing pointer              │
  │     (old version is ALREADY running on edge)     │
  │  3. Done. Seconds.                               │
  │                                                  │
  │  No rebuild. No redeploy. No propagation wait.   │
  │  Both versions were running simultaneously.      │
  │  Rollback = just changing which one gets traffic. │
  └──────────────────────────────────────────────────┘

  And it's per-MFE. Roll back mf_itinerary without
  touching mf_pretrip or mf_duringtrip.
```

### Production Architecture

```
  ┌─────────────────────────────────────────────────────────┐
  │                  tripweave.app                          │
  │                                                         │
  │  Cloudflare DNS (CNAME → ze.zephyrcloud.app)            │
  │       │                                                 │
  │       ▼                                                 │
  │  Cloudflare Workers (Zephyr-managed)                    │
  │       │                                                 │
  │       ├── Routes request to correct MFE version         │
  │       ├── Serves from Cloudflare KV (edge cache)        │
  │       └── Content-addressed dedup across all MFEs       │
  │                                                         │
  │  Zephyr Registry (version → asset mapping)              │
  │       │                                                 │
  │       ├── shell@v1.42.0        → production env         │
  │       ├── mf_pretrip@v2.18.0   → production env         │
  │       ├── mf_itinerary@v1.31.0 → production env         │
  │       └── mf_duringtrip@v1.12.0 → production env        │
  │                                                         │
  │  Each MFE versioned independently.                      │
  │  Each deployable independently.                         │
  │  Each rollbackable independently.                       │
  └─────────────────────────────────────────────────────────┘
```

---

## Why This Matters — 10 People, Output of 50 (45 seconds)

This is the headline. Everything else supports this story.

### The Multiplier: MFE Isolation × AI Agents

```
THE OLD WAY (monolith + 10 devs):
══════════════════════════════════

  10 devs → 1 codebase → constant merge conflicts
  
  Dev A pushes auth change → breaks Dev B's map component
  Dev C waits for Dev D's PR to merge before starting
  CI pipeline: 1 queue, everyone waits
  
  Effective parallelism: maybe 3-4 people at once
  The rest are blocked, reviewing, or fixing conflicts.


THE TRIPWEAVE WAY (MFE + AI agents + 10 devs):
════════════════════════════════════════════════

  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │  SHELL (2 devs)          Isolated. Own repo-like codebase.  │
  │  ├── Auth, nav, routing  Own build. Own deploy.             │
  │  └── Trip switcher       No conflicts with MFE teams.       │
  │                                                             │
  │  MF-PRETRIP (3 devs + AI agents)                            │
  │  ├── Map collaboration   Each dev works on separate          │
  │  ├── Drawing tools       components. AI agents handle        │
  │  ├── Idea enrichment     boilerplate, hooks, UI scaffolding. │
  │  ├── TikTok integration  3 humans + AI = output of 10.      │
  │  ├── Voting system                                          │
  │  └── Area search                                            │
  │                                                             │
  │  MF-ITINERARY (3 devs + AI agents)                          │
  │  ├── Day planner         Same story. Isolated codebase.      │
  │  ├── Budget tracker      AI writes the CRUD, humans          │
  │  ├── Flight search       design the UX and integrations.     │
  │  ├── Photo guide                                            │
  │  ├── Travel guide                                           │
  │  └── Chat panel                                             │
  │                                                             │
  │  MF-DURINGTRIP (2 devs + AI agents)                         │
  │  ├── Live map            Completely independent.             │
  │  ├── Voice assistant     Can ship without touching           │
  │  ├── Food recs           a single line in pretrip            │
  │  └── Notifications       or itinerary.                       │
  │                                                             │
  │  SERVER (shared, but routes are isolated per feature)        │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘

  Effective parallelism: ALL 10 people + their AI agents
  Zero merge conflicts across MFE boundaries.
  Each team deploys independently to Zephyr.
```

### The Numbers

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  22 feature specs written and shipped                        │
│  4 independent microfrontends                                │
│  9 database tables                                           │
│  8 server API routes                                         │
│  6+ AI-powered features                                      │
│  3 real-time channel types (presence, broadcast, DB changes) │
│                                                              │
│  Built in hackathon timeframe.                               │
│  By 10 people.                                               │
│                                                              │
│  That's not 10-person output. That's 50-person output.       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Why MFE Isolation Is the Key Enabler

Without MFE isolation, AI agents would be stepping on each other:

```
MONOLITH + AI AGENTS = CHAOS
════════════════════════════

  AI Agent 1: modifies App.tsx for feature A
  AI Agent 2: modifies App.tsx for feature B     ← CONFLICT
  AI Agent 3: modifies shared utils for feature C ← BREAKS A and B
  
  Result: more time fixing conflicts than building features.


MFE + AI AGENTS = PARALLEL LANES
═════════════════════════════════

  AI Agent 1: modifies mf-pretrip/src/...    ← own lane
  AI Agent 2: modifies mf-itinerary/src/...  ← own lane
  AI Agent 3: modifies mf-duringtrip/src/... ← own lane
  
  Result: zero conflicts. Each agent works in its own MFE.
          Each MFE deploys independently.
          Ship 3 features simultaneously.
```

### Independent Deploys

```
BEFORE (monolith):
  Fix typo in itinerary → rebuild ALL → redeploy ALL → 3 min

AFTER (MFE + Zephyr):
  Fix typo in itinerary → rebuild mf_itinerary only → 30 sec
  Shell auto-resolves the new version at runtime.
  Pre-trip and during-trip: UNTOUCHED.
```

### Fault Isolation

```
┌──────────────────────────────────────────────────────┐
│  mf-duringtrip has a bug?                            │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ pretrip  │  │itinerary │  │  duringtrip  ✗   │   │
│  │   ✓      │  │    ✓     │  │  (error boundary)│   │
│  │ working  │  │ working  │  │  catches it      │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  The rest of the app keeps running.                  │
│  Users can still plan trips and view itineraries.    │
└──────────────────────────────────────────────────────┘
```

### Incremental Loading

```
USER JOURNEY — WHAT GETS LOADED:

  1. User lands on tripweave.app
     └── Shell loads: ~180KB (nav, auth, router)

  2. User clicks "Pre-Trip"
     └── mf_pretrip loads: ~200KB (map, sidebar, AI features)
         React is SHARED — not loaded again

  3. User clicks "Itinerary"
     └── mf_itinerary loads: ~150KB (day view, cards, budget)
         React is SHARED — not loaded again

  4. User clicks "During Trip"
     └── mf_duringtrip loads: ~120KB (live map, voice)
         React is SHARED — not loaded again

  TOTAL if user visits all tabs: ~650KB
  MONOLITH equivalent: ~650KB upfront (even if user only needs pretrip)

  Module Federation = pay for what you use.
```

---

## The Full Stack Picture (15 seconds)

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRIPWEAVE ARCHITECTURE                       │
│                                                                  │
│  FRONTEND (Zephyr Cloud Edge)          BACKEND (Render)          │
│  ┌──────────────────────────┐          ┌──────────────────┐     │
│  │  shell ◄──── tripweave.app          │  Express API     │     │
│  │    │                     │          │                  │     │
│  │    ├── mf_pretrip        │──REST──▶│  /suggestions    │     │
│  │    │   (AI discovery,    │  (SSE)  │  /area-search    │     │
│  │    │    map collab)      │          │  /enrich         │     │
│  │    │                     │          │  /itinerary      │     │
│  │    ├── mf_itinerary      │──REST──▶│  /photo-guide    │     │
│  │    │   (day planner,     │          │  /travel-guide   │     │
│  │    │    budget, flights) │          │  /places         │     │
│  │    │                     │          │  /during-trip    │     │
│  │    └── mf_duringtrip     │──WS───▶│                  │     │
│  │        (live map, voice) │          └────────┬─────────┘     │
│  └──────────────────────────┘                   │               │
│                │                                │               │
│                │  Supabase Realtime              │               │
│                │  (presence, cursors,            │               │
│                │   broadcast, DB changes)        │               │
│                │                                ▼               │
│                └──────────────▶  ┌──────────────────┐           │
│                                  │    Supabase       │           │
│                                  │   (PostgreSQL)    │           │
│                                  │                   │           │
│                                  │  9 tables + RLS   │           │
│                                  │  Realtime channels│           │
│                                  │  Auth + OAuth     │           │
│                                  └──────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Live Demo Talking Points

When showing the app, call out these Zephyr + MFE moments:

1. "Notice the URL stays on tripweave.app — Zephyr Cloud serves our shell from the edge, and when I click Pre-Trip, Module Federation fetches mf_pretrip from Zephyr's edge network. No full page reload. Sub-second load."

2. "I can deploy a fix to the itinerary view without touching the pre-trip code. Zephyr's dependency resolution means the shell automatically picks up the new version — no hardcoded URLs, no manual coordination."

3. "Each tab is a separate application with its own immutable version history on Zephyr. If the during-trip voice assistant crashes, the pre-trip planning keeps working — fault isolation at the deployment level."

4. "Zephyr gives us per-build preview URLs. Every PR gets its own deployed version we can share and test. And if something breaks in production? Instant rollback — Zephyr keeps both versions running on the edge, it just switches which one gets traffic. Seconds, not minutes."

5. "We're deployed to Cloudflare Workers via Zephyr, but we could switch to AWS or Fastly without changing a single line of code. Cloud agnostic, bundler agnostic, framework agnostic."

---

## Tech Stack Summary

```
┌────────────────────┬──────────────────────────────────────────┐
│ MFE Platform       │ Zephyr Cloud (edge deploy, versioning,   │
│                    │ instant rollbacks, dependency resolution) │
│ Build Tool         │ Rsbuild (Rspack-based, Rust-powered)     │
│ Module Federation  │ @module-federation/rsbuild-plugin         │
│ Zephyr Plugin      │ zephyr-rsbuild-plugin                    │
│ CDN / Edge         │ Cloudflare Workers + KV (via Zephyr)     │
│ Framework          │ React 19 + TypeScript                     │
│ Routing            │ TanStack Router (shell only)              │
│ Data Fetching      │ React Query (shared singleton)            │
│ Styling            │ Tailwind CSS + shadcn/ui                  │
│ Real-time          │ Supabase Realtime (presence + broadcast)  │
│ Auth               │ Supabase Auth + Google OAuth              │
│ Backend            │ Express.js on Render                      │
│ Database           │ Supabase (PostgreSQL + RLS)               │
│ AI                 │ OpenAI GPT-4o-mini + Realtime API         │
│ Maps               │ Leaflet + Google Places API               │
│ Flights            │ Amadeus API                               │
└────────────────────┴──────────────────────────────────────────┘
```

---

## Closing (10 seconds)

> "Module Federation gave us isolated lanes. Zephyr Cloud made deployment 
> instant — sub-second edge deploys, immutable versioning, instant rollbacks, 
> and automatic dependency resolution across all 4 MFEs. No hardcoded URLs, 
> no manual version coordination, no vendor lock-in. AI agents gave us 5x 
> throughput per developer. The result: 10 people shipped 22 features across 
> 4 microfrontends in hackathon time. That's the multiplier."
