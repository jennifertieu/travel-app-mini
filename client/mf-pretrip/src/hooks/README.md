# useUserTrips Hook

## Overview

The `useUserTrips` hook fetches all trips for the authenticated user using TanStack Query with proper caching and error handling.

## Usage

```typescript
import { useUserTrips } from '../hooks/useUserTrips';
import { useMember } from '../contexts/MemberContext';

function MyComponent() {
  const { member } = useMember();
  const { data: trips, isLoading, error } = useUserTrips(member?.id || null);

  if (isLoading) return <div>Loading trips...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!trips || trips.length === 0) return <div>No trips found</div>;

  return (
    <div>
      {trips.map(trip => (
        <div key={trip.id}>
          <h3>{trip.title || `Trip to ${trip.destination}`}</h3>
          <p>{trip.destination}</p>
        </div>
      ))}
    </div>
  );
}
```

## Features

- **TanStack Query Integration**: Uses proper caching with key `['user-trips', userId]`
- **Loading States**: Provides `isLoading` state for UI feedback
- **Error Handling**: Graceful error handling with detailed error messages
- **Empty States**: Handles cases where user has no trips
- **Performance Optimized**: 
  - 5-minute stale time (trips don't change frequently)
  - 10-minute garbage collection time
  - Only fetches when userId is provided

## Parameters

- `userId` (string | null): The authenticated user's ID (currently using member ID)

## Returns

- `data`: Array of Trip objects or empty array
- `isLoading`: Boolean indicating if the query is loading
- `error`: Error object if the query fails
- `refetch`: Function to manually refetch the data

## Requirements Satisfied

- ✅ 2.2: Fetches all trips for authenticated user
- ✅ 5.1: Handles loading states
- ✅ 5.2: Handles empty states  
- ✅ 5.3: Handles error states
- ✅ 7.1: TanStack Query integration with proper caching

## Testing

The hook includes both unit tests and integration tests:

- `useUserTrips.test.ts`: Unit tests for the hook logic
- `useUserTrips.integration.test.tsx`: Integration tests with React components
- `UserTripsExample.tsx`: Example component demonstrating usage