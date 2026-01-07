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
