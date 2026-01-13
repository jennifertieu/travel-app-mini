# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Start dev server with hot reload (tsx watch)
pnpm build    # Compile TypeScript to dist/
pnpm start    # Run compiled output
```

Server runs on port 5001 (5000 remapped to avoid macOS AirPlay conflict).

## Architecture

Express 5 + TypeScript backend for a travel itinerary planning app.

**Request flow:** Routes → Controllers → Utils/Services → Supabase

**Key integrations:**
- **Supabase** - Auth (JWT tokens) and PostgreSQL database
- **OpenAI GPT-4o** - AI itinerary generation via function calling
- **Google APIs** - Places API for enrichment, Maps API for travel times

**AI Agent pattern** (`src/utils/aiItineraryBuilderAgent.ts`): Uses an agentic loop with OpenAI function calling. The agent iterates up to 20 times, calling tools like `assign_activity_to_day`, `get_travel_time_between_activities`, and `check_day_conflicts` to build optimized itineraries.

## Code Conventions

- **Files:** camelCase (e.g., `memberProfiles.controller.ts`)
- **Interfaces:** Prefix with `I` (e.g., `IAuthenticatedRequest`)
- **Functions:** Arrow functions for all exports
- **Return types:** Always use named interfaces, never inline object types
- **Control flow:** Prefer `switch` over `else if` chains

**Authentication:** All protected routes use `requireAuth` middleware. Access user via `request.user!` (non-null assertion safe after middleware).

**Supabase queries:** Always specify fields in `.select()`, use `.single()` for single records, let Supabase handle timestamps.

## Detailed Guidelines

See `AGENTS.md` for comprehensive patterns, controller templates, and endpoint creation steps.
