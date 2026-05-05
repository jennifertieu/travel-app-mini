# Trip Data Refetching System Guide

This guide explains how to use the enhanced trip data refetching system that ensures proper cache invalidation and data refreshing when switching between trips.

## Overview

The system consists of several key components:

1. **Query Key Factory** (`queryKeys.ts`) - Centralized query key management
2. **Trip Cache Manager** (`TripCacheManager.ts`) - Comprehensive cache invalidation and performance optimization
3. **Enhanced useCurrentTrip Hook** - Integrated trip switching with cache management
4. **Debug Utilities** - Development tools for monitoring and testing
5. **Integration Tests** - Automated verification of system functionality

## Key Features

### ✅ Comprehensive Cache Invalidation
- Automatically invalidates all trip-specific data when switching trips
- Uses centralized query key patterns for consistency
- Batched operations for better performance

### ✅ Performance Optimization
- Debounced trip switching to handle rapid changes
- Batched cache operations to reduce React Query overhead
- Smart prefetching of critical data only
- Concurrency control for cache operations

### ✅ Enhanced Loading States
- Detailed loading state tracking for all trip components
- Partial loading states for better UX
- Loading state subscriptions for real-time updates

### ✅ Comprehensive Error Handling
- Graceful handling of network failures
- Retry mechanisms for failed queries
- Partial failure states with clear user feedback
- Error boundaries to prevent cascading failures

### ✅ Debug and Monitoring Tools
- Comprehensive logging of all cache operations
- Performance metrics tracking
- Browser console debug utilities
- Integration test suite

## Usage

### Basic Trip Switching

```typescript
import { useCurrentTrip } from './hooks/useCurrentTrip';

function MyComponent() {
  const { 
    currentTrip, 
    setCurrentTrip, 
    loadingState, 
    isSwitching 
  } = useCurrentTrip();

  const handleTripChange = (tripId: string) => {
    setCurrentTrip(tripId); // Automatically handles cache invalidation
  };

  if (isSwitching) {
    return <div>Switching trips...</div>;
  }

  return (
    <div>
      <h1>{currentTrip?.name}</h1>
      {/* Your trip content */}
    </div>
  );
}
```

### Using Trip-Specific Hooks

All trip-specific hooks automatically use the centralized query keys:

```typescript
import { useIdeas } from './hooks/useIdeas';
import { useTripMembers } from './hooks/useTripMembers';
import { useCurrentTrip } from './hooks/useCurrentTrip';

function TripContent() {
  const { currentTripId } = useCurrentTrip();
  const { data: ideas, isLoading: ideasLoading } = useIdeas(currentTripId);
  const { data: members, isLoading: membersLoading } = useTripMembers(currentTripId);

  // Data will automatically refresh when currentTripId changes
  return (
    <div>
      {ideasLoading ? <div>Loading ideas...</div> : <IdeasList ideas={ideas} />}
      {membersLoading ? <div>Loading members...</div> : <MembersList members={members} />}
    </div>
  );
}
```

### Manual Cache Operations

```typescript
import { useCurrentTrip } from './hooks/useCurrentTrip';

function TripActions() {
  const { refreshTripData, retryFailedQueries } = useCurrentTrip();

  const handleRefresh = async () => {
    await refreshTripData(); // Manually refresh all trip data
  };

  const handleRetry = async () => {
    await retryFailedQueries(); // Retry any failed queries
  };

  return (
    <div>
      <button onClick={handleRefresh}>Refresh Data</button>
      <button onClick={handleRetry}>Retry Failed</button>
    </div>
  );
}
```

## Development and Debugging

### Browser Console Debug Tools

In development mode, debug utilities are available at `window.tripDebug`:

```javascript
// Monitor trip switching for a specific trip
tripDebug.monitor('trip-123');

// Log comprehensive state for a trip
tripDebug.logState('trip-123');

// Get React Query state for trip queries
tripDebug.queryState('trip-123');

// Simulate rapid trip switching for testing
tripDebug.simulate(['trip-1', 'trip-2', 'trip-3'], 100);

// Export debug report as JSON
tripDebug.export('trip-123');

// Run integration tests
tripDebug.runTests();

// Clear debug data
tripDebug.clear();

// Show help
tripDebug.help();
```

### Integration Testing

Run the integration test suite to verify system functionality:

```javascript
// In browser console
tripDebug.runTests();
```

The test suite verifies:
- Query key factory consistency
- Cache manager initialization
- Trip switching functionality
- Loading state management
- Error handling
- Performance metrics

### Performance Monitoring

The system tracks performance metrics for each trip switch:

```typescript
import { getTripCacheManager } from './services/TripCacheManager';
import { useQueryClient } from '@tanstack/react-query';

function PerformanceMonitor() {
  const queryClient = useQueryClient();
  const cacheManager = getTripCacheManager(queryClient);

  const metrics = cacheManager.getPerformanceMetrics('trip-123');
  
  if (metrics) {
    console.log('Trip switch duration:', metrics.tripSwitchDuration, 'ms');
    console.log('Invalidated queries:', metrics.invalidationCount);
    console.log('Prefetched queries:', metrics.prefetchCount);
    console.log('Batch size:', metrics.batchSize);
  }
}
```

## Configuration

### Performance Tuning

The system includes several configurable performance parameters:

```typescript
// In TripCacheManager.ts
private readonly BATCH_DELAY = 50; // ms - Delay for batching operations
private readonly DEBOUNCE_DELAY = 100; // ms - Debounce delay for rapid switching
private readonly MAX_CONCURRENT_OPERATIONS = 5; // Max concurrent cache operations
```

### Query Configuration

Query behavior can be configured in the QueryClient:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});
```

## Best Practices

### 1. Always Use Centralized Query Keys
```typescript
// ✅ Good
import { queryKeys } from '../lib/queryKeys';
const queryKey = queryKeys.ideas(tripId);

// ❌ Bad
const queryKey = ['ideas', tripId];
```

### 2. Handle Loading States
```typescript
// ✅ Good
const { loadingState, isSwitching } = useCurrentTrip();

if (isSwitching) {
  return <TripSwitchingLoader />;
}

if (loadingState?.isLoading) {
  return <TripDataLoader />;
}
```

### 3. Use Error Boundaries
```typescript
// ✅ Good
<ErrorBoundary fallback={<TripErrorFallback />}>
  <TripContent />
</ErrorBoundary>
```

### 4. Monitor Performance in Development
```typescript
// ✅ Good - Use debug tools to monitor performance
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const cleanup = tripDebug.monitor(currentTripId);
    return cleanup;
  }
}, [currentTripId]);
```

## Troubleshooting

### Common Issues

1. **Data not refreshing on trip switch**
   - Check if hooks are using centralized query keys
   - Verify TripCacheManager is properly initialized
   - Run `tripDebug.runTests()` to verify system integrity

2. **Performance issues with rapid switching**
   - Check debounce settings in TripCacheManager
   - Monitor batch operation sizes with `tripDebug.logState()`
   - Verify concurrency limits are appropriate

3. **Loading states not updating**
   - Ensure components are subscribed to loading state changes
   - Check if loading state subscriptions are properly cleaned up
   - Verify useCurrentTrip hook is being used correctly

### Debug Commands

```javascript
// Check system health
tripDebug.runTests();

// Monitor specific trip
tripDebug.monitor('your-trip-id');

// Check query states
tripDebug.queryState('your-trip-id');

// Export debug report
console.log(tripDebug.export('your-trip-id'));
```

## Migration Guide

If you're migrating from the old system:

1. **Update query keys** - Replace hardcoded query keys with centralized ones
2. **Use enhanced useCurrentTrip** - Replace direct cache invalidation with the enhanced hook
3. **Add loading state handling** - Implement proper loading states for better UX
4. **Add error boundaries** - Implement error handling for better reliability

The system is designed to be backward compatible, so existing code should continue to work while you gradually adopt the new features.