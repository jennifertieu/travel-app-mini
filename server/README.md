# Travel App Server

Express.js backend for the AI-powered travel companion app.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server (with hot reload)
pnpm dev

# Server runs on http://localhost:5001
```

## Environment Variables

Create a `.env` file in the server directory:

```bash
# Required
PORT=5001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
GOOGLE_MAPS_PLATFORM_API_KEY=your_google_maps_api_key

# Optional (During Trip Agents)
DURING_TRIP_RATE_LIMIT=20        # Daily request limit per user (default: 20)
DURING_TRIP_CACHE_TTL=300        # Context cache TTL in seconds (default: 300)
```

**Note**: Weather uses Open-Meteo API which requires no API key.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm tsx src/utils/aiItineraryBuilderTestFunction.ts` | Test AI itinerary builder |
| `pnpm tsx src/tools/decisionAgentTestFunction.ts` | Test during-trip decision agent |

## Documentation

### For AI Assistants (Claude)

Start here when working on the backend:

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](./CLAUDE.md) | Quick reference for the server codebase |
| [AGENTS.md](./AGENTS.md) | Detailed coding standards and patterns |

### Feature Documentation

Comprehensive docs for major features:

| Feature | Document | Lines |
|---------|----------|-------|
| AI Itinerary Builder | [docs/features/ai-itinerary-builder.md](./docs/features/ai-itinerary-builder.md) | 1100+ |
| During Trip Agents | [docs/features/during-trip-agents.md](./docs/features/during-trip-agents.md) | 1200+ |

### Specs & PRDs

Design documents and specifications:

| Spec | Location |
|------|----------|
| During Trip Agents PRD | [.claude/specs/during-trip-agents-prd.md](./.claude/specs/during-trip-agents-prd.md) |

## Project Structure

```
server/
├── src/
│   ├── app.ts                 # Express server setup, routes, CORS
│   ├── config.ts              # Environment variables, clients
│   ├── controllers/           # Request handlers
│   │   ├── memberProfiles.controller.ts
│   │   ├── itinerary.controller.ts
│   │   ├── enrichment.controller.ts
│   │   └── duringTrip.controller.ts
│   ├── middleware/            # Express middleware
│   │   ├── requireAuth.ts           # JWT validation
│   │   ├── requireTripAccess.ts     # Trip authorization
│   │   └── rateLimitDuringTrip.ts   # Rate limiting
│   ├── routes/                # Route definitions
│   ├── tools/                 # OpenAI function/tool definitions
│   ├── types/                 # TypeScript interfaces
│   │   └── interface.ts       # All shared types
│   └── utils/                 # Helper utilities, AI services
├── docs/
│   ├── features/              # Feature documentation
│   └── ai-sessions/           # AI session summaries
├── .claude/
│   └── specs/                 # PRDs and specifications
├── CLAUDE.md                  # AI assistant quick reference
├── AGENTS.md                  # Coding standards guide
└── package.json
```

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Express 5.x | Web framework |
| TypeScript | Type safety |
| Supabase | Database & auth |
| OpenAI GPT-4o | AI agents |
| Google Maps Platform | Places, geocoding, distance |
| Open-Meteo | Weather data |
| Zod | Request validation |
| pnpm | Package manager |

## Deployment

**Production URL**: https://trip-weave-jlop.onrender.com

Deployed on [Render](https://render.com/).

### Production Requirements

The in-memory rate limiting and caching will NOT work with:
- Multiple server instances
- Server restarts
- Load balancing

For production, use Redis:

```bash
pnpm add ioredis
```

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);
```

Add to `.env`:
```
REDIS_URL=redis://localhost:6379
```

## Caching Strategy

### In-Memory Caching (Development)

| Data | TTL | Purpose |
|------|-----|---------|
| Trip Context | 5 minutes | Avoid rebuilding on every request |
| Weather | 30 minutes | Weather doesn't change frequently |
| Nearby Places | 15 minutes | Google Places API is expensive |
| Place Details | Additive | Never deletes, refreshes if >2 hours old |

### Cache Behavior

- **Context cache**: Returns deep copy to prevent mutations
- **Location updates**: Bypass cache TTL when location changes
- **Trip end**: Clears all cached data for the trip

## Development Tips

1. **Port 5001**: We use 5001 instead of 5000 to avoid macOS AirPlay conflicts

2. **Testing AI agents**: Use the test functions before making API calls:
   ```bash
   pnpm tsx src/tools/decisionAgentTestFunction.ts
   ```

3. **Checking types**: All interfaces are in `src/types/interface.ts`

4. **Adding endpoints**: Follow patterns in existing controllers and add routes to the appropriate routes file

5. **Error handling**: Use the standard error format:
   ```json
   { "error": "Message", "details": "Optional details" }
   ```

## Contributing

1. Read [AGENTS.md](./AGENTS.md) for coding standards
2. Check feature docs before modifying major features
3. Add/update tests for new functionality
4. Follow existing patterns for consistency
