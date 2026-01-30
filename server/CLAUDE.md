# Server Codebase Context

This is the Express.js backend for the travel app, handling authentication, content enrichment, and AI-powered itinerary generation.

## Quick Reference

| Item | Value |
|------|-------|
| Framework | Express 5.x + TypeScript |
| Database | Supabase (PostgreSQL) |
| AI | OpenAI (GPT-4o, GPT-4o-mini) |
| Maps | Google Maps Platform API |
| Package Manager | pnpm |
| Dev Server | `pnpm dev` (port 5001) |
| Production | https://trip-weave-jlop.onrender.com |

---

## Feature Documentation

### AI Itinerary Builder

**If asked about the AI itinerary builder feature, READ THIS FILE FIRST:**

```
server/docs/features/ai-itinerary-builder.md
```

This comprehensive document (1100+ lines) covers:
- Complete architecture and data flow
- API endpoint documentation
- AI agent system with tool calling
- All 5 AI tools and their parameters
- All 8 utility functions
- Complete database schemas
- Voting and filtering algorithms
- Testing instructions

**To run a test of the AI itinerary builder:**

```bash
cd server
pnpm tsx src/utils/aiItineraryBuilderTestFunction.ts
```

This runs a mock 5-day trip through Southern France (Paris → Lyon → Marseille) with 10 activities, testing city clustering, travel segments, and optimal scheduling.

### During Trip Agents

**If asked about the during-trip feature, READ THIS FILE FIRST:**

```
server/docs/features/during-trip-agents.md
```

This covers:
- Real-time contextual trip assistance
- Decision Agent (GPT-4o with tool calling)
- Context building and caching strategy
- Food recommendations and map intelligence
- Conflict detection for activity scheduling

**To run a test of the during-trip decision agent:**

```bash
cd server
pnpm tsx src/utils/decisionAgentTestFunction.ts
```

---

## Directory Structure

```
server/
├── src/
│   ├── app.ts                    # Express server setup, routes, CORS
│   ├── config.ts                 # Environment variables, Supabase/OpenAI clients
│   ├── controllers/              # Request handlers (business logic)
│   ├── middleware/               # Express middleware (auth)
│   ├── routes/                   # Route definitions
│   ├── tools/                    # OpenAI function/tool definitions
│   ├── types/                    # TypeScript interfaces
│   └── utils/                    # Helper utilities, AI services
├── docs/                         # Documentation
│   ├── features/                 # Feature-specific docs
│   └── ai-sessions/              # AI session summaries
├── AGENTS.md                     # Detailed backend development guide
└── package.json
```

---

## API Endpoints

### Member Profiles (`/member-profiles`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/member-profiles/` | Yes | Get authenticated user's profile |
| PATCH | `/member-profiles/` | Yes | Update profile preferences |
| DELETE | `/member-profiles/` | Yes | Delete user profile |

### Itinerary (`/itinerary`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/itinerary/:id` | Yes | Generate AI itinerary for trip |

### Enrichment (`/enrich`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/enrich/` | No | Enrich TikTok/YouTube content with AI |

### During Trip (`/during-trip`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/during-trip/context` | Yes | Get current trip context |
| POST | `/during-trip/decide` | Yes | Get "What Now?" suggestions (rate-limited) |
| POST | `/during-trip/food` | Yes | Get food recommendations (rate-limited) |
| POST | `/during-trip/map-intelligence` | Yes | Get map annotations |
| PATCH | `/during-trip/activity/:id/status` | Yes | Update activity progress |
| POST | `/during-trip/suggestions/accept` | Yes | Accept suggestion & add to itinerary |

---

## Key Files

### Controllers

| File | Purpose |
|------|---------|
| `memberProfiles.controller.ts` | CRUD for user profiles |
| `itinerary.controller.ts` | Itinerary generation with voting logic |
| `enrichment.controller.ts` | Content enrichment pipeline |
| `duringTrip.controller.ts` | During-trip context, decisions, food, map annotations |

### Middleware

| File | Purpose |
|------|---------|
| `requireAuth.ts` | JWT validation via Supabase |
| `requireTripAccess.ts` | Trip ownership/membership verification |
| `rateLimitDuringTrip.ts` | Per-user daily rate limiting (20/day default) |

### AI & Utils

| File | Purpose |
|------|---------|
| `aiItineraryBuilderAgent.ts` | Multi-turn AI agent for itinerary planning |
| `aiService.ts` | OpenAI enrichment generation |
| `unfurl.ts` | TikTok/YouTube metadata extraction |
| `placeMatching.ts` | Google Places API integration |
| `itineraryAgentTools.ts` | OpenAI tool definitions for itinerary agent |
| `contextBuilder.ts` | Aggregates trip context from multiple sources |
| `decisionAgent.ts` | GPT-4o agent for "What Now?" suggestions |
| `foodRecommendations.ts` | Google Places food recommendations |
| `mapIntelligence.ts` | Map annotation generation |
| `weatherService.ts` | Open-Meteo integration |
| `validationSchemas.ts` | Zod schemas for request validation |
| `duringTripAgentTools.ts` | OpenAI tool definitions for decision agent |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `member_profiles` | User preferences (dietary, travel style, interests) |
| `trips` | Trip metadata (destination, dates) |
| `trip_reel_ideas` | Activities from TikTok/YouTube content |
| `trip_reel_idea_reactions` | Member votes (fire/down/meh/skip) |
| `trip_itineraries` | Generated itineraries (JSONB) |
| `trip_members` | Trip membership for group trips |

---

## Authentication

All protected endpoints require:

```
Authorization: Bearer <supabase_jwt_token>
```

The `requireAuth` middleware validates the token and sets `request.user` to the authenticated Supabase user.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default: 5001) |
| `OPENAI_API_KEY` | OpenAI API access |
| `GOOGLE_MAPS_PLATFORM_API_KEY` | Google Maps/Places API |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DURING_TRIP_RATE_LIMIT` | Daily request limit per user (default: 20) |
| `DURING_TRIP_CACHE_TTL` | Context cache TTL in seconds (default: 300) |

---

## Common Commands

```bash
# Development (with hot reload)
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start

# Run AI itinerary builder test
pnpm tsx src/utils/aiItineraryBuilderTestFunction.ts

# Run during-trip decision agent test
pnpm tsx src/utils/decisionAgentTestFunction.ts
```

---

## Error Response Format

All endpoints return errors in this format:

```json
{
  "error": "Error message here",
  "details": "Optional additional details"
}
```

Status codes:
- `400` - Bad request / validation error
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not authorized for trip)
- `404` - Resource not found
- `409` - Conflict (scheduling conflicts)
- `429` - Rate limit exceeded
- `500` - Server error

---

## Coding Standards

See `AGENTS.md` for detailed coding standards including:
- TypeScript practices
- Controller structure templates
- Error handling patterns
- Database query patterns
- Response format standards

Key conventions:
- Use `switch` statements for multiple conditions
- Use camelCase for variables and functions
- Always include proper TypeScript types
- Handle errors with try-catch and appropriate status codes
