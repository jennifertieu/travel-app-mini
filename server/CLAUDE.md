# Travel App Server

Express.js + TypeScript backend for a travel itinerary planning application.

## Tech Stack

- **Framework:** Express 5.x with TypeScript
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI GPT-4o for itinerary generation
- **APIs:** Google Places API, Google Maps API
- **Auth:** Supabase JWT tokens via `requireAuth` middleware

## Project Structure

```
src/
├── controllers/    # Business logic handlers
├── routes/         # Express route definitions
├── middleware/     # Express middleware (auth)
├── types/          # TypeScript interfaces
├── tools/          # LLM tool definitions for agents
├── utils/          # Utility functions & AI services
├── app.ts          # Express app setup
└── config.ts       # Service initialization (Supabase, OpenAI)
```

## Key Patterns

### Architecture
- MVC pattern: Routes → Controllers → Utils/Services → Supabase
- All protected routes use `requireAuth` middleware
- Controllers extract user from `request.user!` (safe after auth middleware)

### Naming Conventions
- Files: camelCase (e.g., `memberProfiles.controller.ts`)
- Interfaces: Prefix with `I` (e.g., `IAuthenticatedRequest`)
- Functions: Arrow functions for all exports

### Error Handling
```typescript
try {
  const { data, error } = await supabase.from(...).select(...)
  if (error) return response.status(404).json({ error: error.message })
  return response.status(200).json(data)
} catch (error: any) {
  return response.status(500).json({ error: "Action failed", details: error.message })
}
```

### Supabase Queries
- Explicitly select fields: `.select("field1, field2")`
- Use `.single()` for single record queries
- Let Supabase manage `created_at`, `updated_at`

## Core Features

1. **Member Profiles** - User profile management
2. **Enrichment** - Transform social media content into structured travel ideas
3. **Itinerary Generation** - AI-powered trip scheduling using agentic tool calling

## Development

```bash
pnpm dev      # Start with tsx watch
pnpm build    # Compile TypeScript
pnpm start    # Run compiled output
```

## Environment Variables

See `.env.example` for required variables:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_PLACES_API_KEY`, `GOOGLE_MAPS_API_KEY`
- `PORT` (defaults to 5001)

## Additional Documentation

See `AGENTS.md` for detailed coding standards and endpoint creation guidelines.
