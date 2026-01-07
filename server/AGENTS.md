# Backend Development Guide

## Project Overview

- Travel app backend built with Express.js and TypeScript
- Uses Supabase for authentication and database
- Organized by routes → controllers → services pattern
- Middleware-based authentication with JWT tokens

## Folder Structure

- `src/` - Main source code
- `src/controllers/` - Business logic for each feature, organized by domain (ai, memberProfiles, etc.)
- `src/routes/` - Express route definitions
- `src/middleware/` - Express middleware (auth, validation, etc.)
- `src/types/` - TypeScript interfaces and types
- `src/tools/` - LLM tools built for the OpenAI API (function definitions for the AI model to call)
- `src/config.ts` - Environment variables and service initialization

## Coding Standards

### File Naming

- All files use camelCase (e.g., `memberProfiles.controller.ts`, `requireAuth.ts`, `config.ts`)

### TypeScript

- Use interfaces prefixed with `I` (e.g., `IAuthenticatedRequest`, `IUpdateMemberProfile`)
- Type all function parameters and return types
- Use `any` only as last resort

### API Endpoints

- Routes register directly without `/api` prefix (e.g., `app.use("/member-profiles", memberProfileRoutes)`)
- Protected routes use `requireAuth` middleware
- HTTP methods: GET (fetch), POST (create), PATCH (update), DELETE (delete)

### Error Handling

- Try-catch blocks in all controllers
- Return Supabase error messages for 404 (not found)
- Return specific error details for 500 (server errors)
- Status codes: 200 (success), 404 (not found), 500 (server error), 401 (unauthorized)

### Database

- Use Supabase JavaScript client (`supabase.from()`)
- Select only necessary fields (security + performance)
- Let Supabase handle timestamps (`created_at`, `updated_at`)
- Use `.single()` when expecting one record

## Key Files

- [`app.ts`](src/app.ts) - Express setup and route registration
- [`config.ts`](src/config.ts) - Environment variables and Supabase client
- [`requireAuth.ts`](src/middleware/requireAuth.ts) - Authentication middleware
- [`interface.ts`](src/types/interface.ts) - TypeScript interfaces

## Authentication Flow

The `requireAuth` middleware validates JWT tokens from Supabase and attaches the authenticated user to the request:

1. Client sends request with `Authorization: Bearer <token>` header
2. `requireAuth` middleware extracts and validates the token with Supabase
3. If valid, `request.user` is set and the route handler runs
4. If invalid/missing, returns 401 error immediately

In controllers, access the authenticated user with:

```typescript
const { id: userId } = request.user!; // Non-null assertion because requireAuth guarantees it exists
```

## Controller Structure

Standard controller function pattern:

```typescript
export const getResource = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;

    // Query the database
    const { data: resource, error } = await supabase
      .from("resources")
      .select("field1, field2, field3")
      .eq("id", userId)
      .single();

    if (error) {
      return response.status(404).json({ error: error.message });
    }

    return response.status(200).json(resource);
  } catch (error: any) {
    return response
      .status(500)
      .json({ error: "Failed to fetch", details: error.message });
  }
};
```

## Database Query Pattern

Standard Supabase query with error handling:

```typescript
const { data: result, error } = await supabase
  .from("table_name")
  .select("col1, col2, col3") // Select only needed fields
  .eq("id", userId) // Filter by condition
  .single(); // Expect one record; omit for multiple

if (error) {
  return response.status(404).json({ error: error.message });
}
// Use result safely here
```

## Response Format

Standard JSON response structures:

**Success (200):**

```json
{ "display_name": "John", "dietary": ["vegan"], "travel_style": "balanced" }
```

**Not Found (404):**

```json
{ "error": "No rows found" }
```

**Server Error (500):**

```json
{
  "error": "Failed to fetch resource",
  "details": "Database connection timeout"
}
```

## Creating a New Endpoint

Follow these steps to add a new API endpoint:

1. **Define the route** - Create `featureName.routes.ts` in `src/routes/`
2. **Create the controller** - Add handler function in `src/controllers/featureName.controller.ts`
3. **Add types** - Define interfaces in `src/types/interface.ts` if needed
4. **Register the route** - Add `app.use("/feature-name", featureRoutes)` in `app.ts`
5. **Add middleware** - Include `requireAuth` in the route definition if authentication is needed

## Environment Variables

Required environment variables (set in `.env`):

- `PORT` - Server port (default: 3000)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for server-side operations

## Common Mistakes

- **Missing `.single()`** - Always use `.single()` when expecting exactly one record; omit for multiple rows
- **Untyped parameters** - Type all function parameters and return types; avoid `any` except as last resort
- **Forgotten middleware** - Protect routes that need auth by including `requireAuth` in the route definition
- **Wrong error status** - Use 404 for not found with Supabase error, 500 for server errors with details
- **Selecting all fields** - Always specify which fields you need in `.select()`; avoid selecting all for security
