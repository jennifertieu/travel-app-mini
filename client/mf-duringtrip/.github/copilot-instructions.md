# DuringTrip - GitHub Copilot Workspace Instructions

## Project Overview

DuringTrip is a Progressive Web App (PWA) for real-time travel assistance. It solves in-the-moment travel crises with context-aware AI recommendations, real-time location tracking, and group coordination.

**Status**: MVP Foundation Complete | **Next**: API Integration + AI Agent

---

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build**: Vite 5.0 + vite-plugin-pwa
- **UI**: shadcn/ui + Tailwind CSS 3.4
- **Maps**: Mapbox GL JS 3.17
- **Database**: Supabase (PostgreSQL + Realtime)
- **APIs**: Google Places, OpenTable/Resy, GPT-4/Claude
- **Location**: Browser Geolocation API
- **Notifications**: Service Worker API

---

## Code Patterns

### Component Structure
```typescript
// Use functional components with TypeScript
import React from 'react';

interface MyComponentProps {
  // Props interface
}

export const MyComponent: React.FC<MyComponentProps> = ({ prop1, prop2 }) => {
  // Component logic
  return <div>...</div>;
};
```

### Custom Hooks
```typescript
// Pattern: useFeatureName
import { useState, useEffect } from 'react';

export const useFeatureName = () => {
  const [state, setState] = useState<Type>(initialValue);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  return { state, actions };
};
```

### shadcn/ui Components
```typescript
// Always import from @/components/ui
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Use variants for styling
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
```

### Tailwind CSS Styling
```typescript
// Use utility classes, no inline styles
<div className="flex items-center gap-4 p-4">
  <span className="text-sm text-muted-foreground">Label</span>
</div>

// Use cn() helper for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  variant === "danger" && "danger-classes"
)}>
```

---

## Critical Patterns

### 1. Service Worker Notifications

**DO THIS**:
```typescript
// Use the custom hook (handles Service Worker automatically)
import { useNotifications } from '@/hooks/useNotifications';

const { sendNotification, permission } = useNotifications();

sendNotification('Title', {
  body: 'Notification message',
  icon: '/icon-192x192.png',
  tag: 'unique-tag',
});
```

**DON'T DO THIS**:
```typescript
// ❌ Never use basic Notification API directly (Firefox macOS incompatibility)
new Notification('Title', { body: 'Message' });
```

### 2. Geolocation

**DO THIS**:
```typescript
// Use the custom hook
import { useLocation } from '@/hooks/useLocation';

const { location, error, isLoading } = useLocation();

if (location) {
  console.log(`${location.latitude}, ${location.longitude}`);
}
```

### 3. Mapbox Integration

**DO THIS**:
```typescript
// Always use environment variable
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Include Safari ITP workaround
const map = new mapboxgl.Map({
  container: mapContainer.current,
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [longitude, latitude],
  zoom: 14,
  transformRequest: (url, resourceType) => {
    // Safari compatibility: append token to URL
    if (url.includes('api.mapbox.com') && !url.includes('access_token=')) {
      const separator = url.includes('?') ? '&' : '?';
      return {
        url: `${url}${separator}access_token=${mapboxgl.accessToken}`,
      };
    }
    return { url };
  },
});
```

**DON'T DO THIS**:
```typescript
// ❌ Never hardcode tokens
mapboxgl.accessToken = 'pk.hardcoded.token';
```

### 4. Environment Variables

**Pattern**:
```typescript
// All env vars MUST use VITE_ prefix
const token = import.meta.env.VITE_MAPBOX_TOKEN;
const apiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Always provide fallbacks or error handling
if (!token) {
  console.error('VITE_MAPBOX_TOKEN is required');
}
```

---

## File Organization

### Component Files
- Place in `src/components/`
- UI primitives in `src/components/ui/` (shadcn/ui)
- Name: PascalCase (e.g., `MapView.tsx`, `NotificationDemo.tsx`)

### Hook Files
- Place in `src/hooks/`
- Name: camelCase with `use` prefix (e.g., `useLocation.ts`, `useNotifications.ts`)
- Export named hook function

### Style Files
- `src/styles/globals.css`: Tailwind directives + CSS variables
- `src/styles/app.css`: Legacy styles (TODO: migrate to Tailwind)
- Component-specific styles: Use Tailwind utilities only

### Types
- Place in `src/types/`
- Name: camelCase (e.g., `location.ts`, `trip.ts`)

---

## User Stories Reference

### Epic 1: Real-Time Crisis Resolution
- US-01: Push notifications for cancelled reservations ✅ Foundation complete
- US-02: Show 3 curated alternatives based on location 🔨 In progress
- US-03: One-tap booking ❌ Not started
- US-04: Notify group members of changes ❌ Not started

### Epic 2: Group Coordination
- US-05: AI-powered nearby recommendations ❌ Not started
- US-06: Shared map with group locations 🔨 In progress
- US-07: Personal itinerary management ❌ Not started

### Epic 3: Dynamic Replanning
- US-08: AI suggestions when finishing early ❌ Not started
- US-09: Propose early meetups ❌ Not started
- US-10: Automatic itinerary sync ❌ Not started

---

## Common Tasks

### Adding a New shadcn/ui Component
```bash
# From project root
npx shadcn@latest add <component-name>
# Example: npx shadcn@latest add dialog
```

### Creating a New API Hook
```typescript
// src/hooks/useGooglePlaces.ts
import { useState, useEffect } from 'react';

interface PlacesResult {
  // Type definition
}

export const useGooglePlaces = (query: string, location: { lat: number; lng: number }) => {
  const [results, setResults] = useState<PlacesResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      setIsLoading(true);
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_PLACES_KEY;
        const response = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=1000&keyword=${query}&key=${apiKey}`);
        const data = await response.json();
        setResults(data.results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    if (query && location) {
      fetchPlaces();
    }
  }, [query, location]);

  return { results, isLoading, error };
};
```

### Supabase Database Queries
```typescript
// Pattern for Supabase queries
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Read
const { data, error } = await supabase
  .from('trips')
  .select('*')
  .eq('id', tripId);

// Insert
const { data, error } = await supabase
  .from('itinerary_items')
  .insert({ trip_id: tripId, place_name: name, time: timestamp });

// Realtime subscription
const channel = supabase
  .channel('trip-updates')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips' }, (payload) => {
    console.log('Trip updated:', payload);
  })
  .subscribe();
```

---

## Testing

### Manual Testing Checklist
- Map loads within 3 seconds
- Location accuracy shows ±10m
- Notifications work on all browsers (Chrome, Safari, Firefox)
- PWA install prompt appears
- Service Worker registers (DevTools → Application → Service Workers)

### Browser-Specific Testing
- **Safari**: Test Mapbox token authentication (ITP workaround)
- **Firefox macOS**: Test notifications (Service Worker approach)
- **Chrome**: Test PWA installation
- **Mobile**: Test geolocation and responsive UI

---

## Environment Setup

### Required `.env.local`
```bash
VITE_MAPBOX_TOKEN=pk.eyJ1IjoibGd0LTIwMjYi...  # Required
```

### Optional `.env.local`
```bash
VITE_GOOGLE_PLACES_KEY=AIzaSy...              # For live restaurant data
VITE_OPENAI_API_KEY=sk-...                    # For AI agent
VITE_SUPABASE_URL=https://...                 # For multi-user features
VITE_SUPABASE_ANON_KEY=eyJ...                 # For multi-user features
```

---

## Known Issues & Limitations

- Mapbox token currently hardcoded in MapView.tsx (TODO: env var only)
- No unit tests (hackathon speed priority)
- Console logs excessive (debugging artifacts)
- Demo uses hardcoded Tokyo data
- Real-time location is last-known only (not live WebSocket)
- No user authentication flow yet

---

## Quick Reference

### Dev Commands
```bash
npm run dev      # Start dev server (http://localhost:3003)
npm run build    # Build for production
npm run preview  # Preview production build
```

### Important Paths
- Service Worker: `public/sw.js`
- Mapbox component: `src/components/MapView.tsx`
- Notification hook: `src/hooks/useNotifications.ts`
- Location hook: `src/hooks/useLocation.ts`
- Vite config: `vite.config.ts`
- Tailwind config: `tailwind.config.js`

---

*For full technical specification, see `.claude/instructions.md`*
