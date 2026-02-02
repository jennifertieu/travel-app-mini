/**
 * Debug utilities for monitoring trip switching performance and React Query state
 */

import { QueryClient } from "@tanstack/react-query";
import { getTripCacheManager } from "../services/TripCacheManager";
import { addIntegrationTestsToGlobal } from "./integrationTestUtils";

/**
 * Debug utilities for trip cache operations
 */
export class TripDebugUtils {
  private static instance: TripDebugUtils;
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  static getInstance(queryClient: QueryClient): TripDebugUtils {
    if (!TripDebugUtils.instance) {
      TripDebugUtils.instance = new TripDebugUtils(queryClient);
    }
    return TripDebugUtils.instance;
  }

  /**
   * Monitor trip switching performance
   */
  monitorTripSwitching(tripId: string): () => void {
    const cacheManager = getTripCacheManager(this.queryClient);

    console.group(`🔍 Monitoring trip switching for ${tripId}`);

    // Subscribe to cache events
    const unsubscribeEvents = cacheManager.subscribeToEvents((event) => {
      if (event.toTripId === tripId || event.fromTripId === tripId) {
        console.log(`📊 Cache Event:`, {
          type: event.type,
          from: event.fromTripId,
          to: event.toTripId,
          success: event.success,
          affectedQueries: event.affectedQueries.length,
          performanceMetrics: event.performanceMetrics,
          errors: event.errors,
        });
      }
    });

    // Subscribe to loading state changes
    const unsubscribeLoading = cacheManager.subscribeToLoadingStateChanges(
      (state) => {
        if (state.tripId === tripId) {
          console.log(`🔄 Loading State Change:`, {
            tripId: state.tripId,
            isLoading: state.isLoading,
            isSwitching: state.isSwitching,
            componentStates: Object.keys(state.loadingComponents).length,
            error: state.overallError?.message,
          });
        }
      },
    );

    // Return cleanup function
    return () => {
      unsubscribeEvents();
      unsubscribeLoading();
      console.groupEnd();
    };
  }

  /**
   * Get React Query cache state for trip-specific queries
   */
  getTripQueryState(tripId: string): {
    queries: Array<{
      queryKey: readonly unknown[];
      state: string;
      dataUpdatedAt: number;
      errorUpdatedAt: number;
      isStale: boolean;
      isFetching: boolean;
    }>;
    summary: {
      total: number;
      stale: number;
      fetching: number;
      error: number;
      success: number;
    };
  } {
    const queryCache = this.queryClient.getQueryCache();
    const allQueries = queryCache.getAll();

    // Filter trip-specific queries
    const tripQueries = allQueries.filter((query) => {
      const queryKey = query.queryKey;
      if (queryKey.length >= 2 && typeof queryKey[1] === "string") {
        return queryKey[1] === tripId;
      }
      return false;
    });

    const queries = tripQueries.map((query) => ({
      queryKey: query.queryKey,
      state: query.state.status,
      dataUpdatedAt: query.state.dataUpdatedAt,
      errorUpdatedAt: query.state.errorUpdatedAt,
      isStale: query.isStale(),
      isFetching: query.state.fetchStatus === "fetching",
    }));

    const summary = {
      total: queries.length,
      stale: queries.filter((q) => q.isStale).length,
      fetching: queries.filter((q) => q.isFetching).length,
      error: queries.filter((q) => q.state === "error").length,
      success: queries.filter((q) => q.state === "success").length,
    };

    return { queries, summary };
  }

  /**
   * Log comprehensive trip state information
   */
  logTripState(tripId: string): void {
    const cacheManager = getTripCacheManager(this.queryClient);

    console.group(`🔍 Trip State Debug: ${tripId}`);

    // Loading state
    const loadingState = cacheManager.getTripLoadingState(tripId);
    console.log("Loading State:", loadingState);

    // Performance metrics
    const metrics = cacheManager.getPerformanceMetrics(tripId);
    console.log("Performance Metrics:", metrics);

    // Query state
    const queryState = this.getTripQueryState(tripId);
    console.log("Query State:", queryState);

    // Recent logs
    const recentLogs = cacheManager.getRecentDebugLogs(10);
    console.log(
      "Recent Logs:",
      recentLogs.filter((log: any) => log.tripId === tripId),
    );

    console.groupEnd();
  }

  /**
   * Simulate rapid trip switching for testing
   */
  async simulateRapidSwitching(
    tripIds: string[],
    switchDelay: number = 100,
  ): Promise<void> {
    const cacheManager = getTripCacheManager(this.queryClient);

    console.group(`🧪 Simulating rapid trip switching`);
    console.log(
      `Switching between ${tripIds.length} trips with ${switchDelay}ms delay`,
    );

    for (let i = 0; i < tripIds.length; i++) {
      const fromTripId = i > 0 ? tripIds[i - 1] : null;
      const toTripId = tripIds[i];

      console.log(`Switching from ${fromTripId} to ${toTripId}`);
      await cacheManager.switchTrip(fromTripId, toTripId);

      if (i < tripIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, switchDelay));
      }
    }

    console.groupEnd();
  }

  /**
   * Export debug report for a trip
   */
  exportDebugReport(tripId: string): string {
    const cacheManager = getTripCacheManager(this.queryClient);
    const debugInfo = cacheManager.getDebugInfo(tripId);
    const queryState = this.getTripQueryState(tripId);

    const report = {
      tripId,
      timestamp: new Date().toISOString(),
      debugInfo,
      queryState,
      reactQueryDevToolsUrl:
        "Open React Query DevTools to see live query state",
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Clear all debug data
   */
  clearDebugData(): void {
    const cacheManager = getTripCacheManager(this.queryClient);
    cacheManager.clearDebugLogs();
    console.log("🧹 Debug data cleared");
  }
}

/**
 * Global debug utilities for browser console access
 */
export function setupGlobalDebugUtils(queryClient: QueryClient): void {
  const debugUtils = TripDebugUtils.getInstance(queryClient);

  // Make debug utilities available globally in development
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    (window as any).tripDebug = {
      monitor: (tripId: string) => debugUtils.monitorTripSwitching(tripId),
      logState: (tripId: string) => debugUtils.logTripState(tripId),
      queryState: (tripId: string) => debugUtils.getTripQueryState(tripId),
      simulate: (tripIds: string[], delay?: number) =>
        debugUtils.simulateRapidSwitching(tripIds, delay),
      export: (tripId: string) => debugUtils.exportDebugReport(tripId),
      clear: () => debugUtils.clearDebugData(),
      help: () => {
        console.log(`
🔍 Trip Debug Utilities:
- tripDebug.monitor(tripId) - Monitor trip switching for a specific trip
- tripDebug.logState(tripId) - Log comprehensive state for a trip
- tripDebug.queryState(tripId) - Get React Query state for trip queries
- tripDebug.simulate([tripId1, tripId2], delay) - Simulate rapid switching
- tripDebug.export(tripId) - Export debug report as JSON
- tripDebug.clear() - Clear all debug data
- tripDebug.runTests() - Run integration tests
- tripDebug.help() - Show this help message
        `);
      },
    };

    // Add integration tests to global debug utils
    addIntegrationTestsToGlobal(queryClient);

    console.log("🔍 Trip debug utilities available at window.tripDebug");
    console.log("Run tripDebug.help() for available commands");
    console.log("Run tripDebug.runTests() to verify system integration");
  }
}
