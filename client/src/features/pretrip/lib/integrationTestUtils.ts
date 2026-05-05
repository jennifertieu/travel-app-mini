/**
 * Integration test utilities for trip data refetching system
 * These utilities help verify that the trip switching functionality works correctly
 */

import { QueryClient } from "@tanstack/react-query";
import { getTripCacheManager } from "../services/TripCacheManager";
import { queryKeys } from "./queryKeys";

/**
 * Integration test suite for trip data refetching
 */
export class TripRefetchingIntegrationTest {
  private queryClient: QueryClient;
  private cacheManager: ReturnType<typeof getTripCacheManager>;
  private testResults: Array<{
    test: string;
    passed: boolean;
    details?: any;
    error?: Error;
  }> = [];

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.cacheManager = getTripCacheManager(queryClient);
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: typeof this.testResults;
  }> {
    console.group("🧪 Running Trip Refetching Integration Tests");

    this.testResults = [];

    // Test 1: Query key factory consistency
    await this.testQueryKeyFactory();

    // Test 2: Cache manager initialization
    await this.testCacheManagerInitialization();

    // Test 3: Trip switching with mock data
    await this.testTripSwitching();

    // Test 4: Loading state management
    await this.testLoadingStateManagement();

    // Test 5: Error handling
    await this.testErrorHandling();

    // Test 6: Performance metrics
    await this.testPerformanceMetrics();

    const passed = this.testResults.filter((r) => r.passed).length;
    const failed = this.testResults.filter((r) => !r.passed).length;

    console.log(`✅ Tests passed: ${passed}`);
    console.log(`❌ Tests failed: ${failed}`);
    console.groupEnd();

    return {
      passed,
      failed,
      results: this.testResults,
    };
  }

  private async testQueryKeyFactory(): Promise<void> {
    try {
      const tripId = "test-trip-123";

      // Test individual query keys
      const tripKey = queryKeys.trip(tripId);
      const ideasKey = queryKeys.ideas(tripId);
      const membersKey = queryKeys.members(tripId);
      const suggestionsKey = queryKeys.suggestions(tripId);

      // Test getAllTripKeys
      const allKeys = queryKeys.getAllTripKeys(tripId);

      // Test utility methods
      const isTripSpecific = queryKeys.isTripSpecific(ideasKey);
      const extractedTripId = queryKeys.extractTripId(ideasKey);

      const passed =
        tripKey[0] === "trip" &&
        tripKey[1] === tripId &&
        ideasKey[0] === "ideas" &&
        ideasKey[1] === tripId &&
        allKeys.length > 0 &&
        isTripSpecific &&
        extractedTripId === tripId;

      this.testResults.push({
        test: "Query Key Factory",
        passed,
        details: {
          tripKey,
          ideasKey,
          membersKey,
          suggestionsKey,
          allKeysCount: allKeys.length,
          isTripSpecific,
          extractedTripId,
        },
      });
    } catch (error) {
      this.testResults.push({
        test: "Query Key Factory",
        passed: false,
        error: error as Error,
      });
    }
  }

  private async testCacheManagerInitialization(): Promise<void> {
    try {
      const tripId = "test-trip-456";

      // Test loading state
      const loadingState = this.cacheManager.getTripLoadingState(tripId);

      // Test performance metrics (should be null initially)
      const metrics = this.cacheManager.getPerformanceMetrics(tripId);

      // Test debug info
      const debugInfo = this.cacheManager.getDebugInfo(tripId);

      const passed =
        loadingState.tripId === tripId &&
        !loadingState.isLoading &&
        !loadingState.isSwitching &&
        metrics === null &&
        debugInfo.currentLoadingStates.length >= 0;

      this.testResults.push({
        test: "Cache Manager Initialization",
        passed,
        details: {
          loadingState,
          metrics,
          debugInfoKeys: Object.keys(debugInfo),
        },
      });
    } catch (error) {
      this.testResults.push({
        test: "Cache Manager Initialization",
        passed: false,
        error: error as Error,
      });
    }
  }

  private async testTripSwitching(): Promise<void> {
    try {
      const fromTripId = "test-trip-from";
      const toTripId = "test-trip-to";

      // Add some mock queries to the cache
      this.queryClient.setQueryData(queryKeys.ideas(fromTripId), [
        { id: "1", title: "Old idea" },
      ]);
      this.queryClient.setQueryData(queryKeys.ideas(toTripId), [
        { id: "2", title: "New idea" },
      ]);

      // Perform trip switch
      await this.cacheManager.switchTrip(fromTripId, toTripId);

      // Check if performance metrics were recorded
      const metrics = this.cacheManager.getPerformanceMetrics(toTripId);

      // Check loading state
      const loadingState = this.cacheManager.getTripLoadingState(toTripId);

      const passed =
        metrics !== null &&
        metrics.tripSwitchDuration > 0 &&
        !loadingState.isLoading &&
        !loadingState.isSwitching;

      this.testResults.push({
        test: "Trip Switching",
        passed,
        details: {
          metrics,
          loadingState,
          fromTripId,
          toTripId,
        },
      });
    } catch (error) {
      this.testResults.push({
        test: "Trip Switching",
        passed: false,
        error: error as Error,
      });
    }
  }

  private async testLoadingStateManagement(): Promise<void> {
    try {
      const tripId = "test-trip-loading";
      let stateChanges = 0;

      // Subscribe to loading state changes
      const unsubscribe = this.cacheManager.subscribeToLoadingStateChanges(
        (state) => {
          if (state.tripId === tripId) {
            stateChanges++;
          }
        },
      );

      // Trigger a trip switch to generate loading state changes
      await this.cacheManager.switchTrip(null, tripId);

      // Clean up subscription
      unsubscribe();

      const finalState = this.cacheManager.getTripLoadingState(tripId);

      const passed =
        stateChanges > 0 && !finalState.isLoading && !finalState.isSwitching;

      this.testResults.push({
        test: "Loading State Management",
        passed,
        details: {
          stateChanges,
          finalState,
        },
      });
    } catch (error) {
      this.testResults.push({
        test: "Loading State Management",
        passed: false,
        error: error as Error,
      });
    }
  }

  private async testErrorHandling(): Promise<void> {
    try {
      const tripId = "test-trip-error";

      // Test retry failed queries (should not throw even if no failed queries)
      await this.cacheManager.retryFailedQueries(tripId);

      // Test refresh trip data
      await this.cacheManager.refreshTripData(tripId);

      const passed = true; // If we get here without throwing, the test passed

      this.testResults.push({
        test: "Error Handling",
        passed,
        details: {
          message: "Error handling methods executed without throwing",
        },
      });
    } catch (error) {
      this.testResults.push({
        test: "Error Handling",
        passed: false,
        error: error as Error,
      });
    }
  }

  private async testPerformanceMetrics(): Promise<void> {
    try {
      const tripId = "test-trip-perf";

      // Perform a trip switch to generate metrics
      await this.cacheManager.switchTrip(null, tripId);

      // Get metrics
      const metrics = this.cacheManager.getPerformanceMetrics(tripId);
      const allMetrics = this.cacheManager.getAllPerformanceMetrics();

      const passed =
        metrics !== null &&
        typeof metrics.tripSwitchDuration === "number" &&
        metrics.tripSwitchDuration >= 0 &&
        allMetrics.size > 0;

      this.testResults.push({
        test: "Performance Metrics",
        passed,
        details: {
          metrics,
          allMetricsSize: allMetrics.size,
        },
      });
    } catch (error) {
      this.testResults.push({
        test: "Performance Metrics",
        passed: false,
        error: error as Error,
      });
    }
  }

  /**
   * Get test results summary
   */
  getTestSummary(): string {
    const passed = this.testResults.filter((r) => r.passed).length;
    const failed = this.testResults.filter((r) => !r.passed).length;
    const total = this.testResults.length;

    let summary = `\n🧪 Trip Refetching Integration Test Results:\n`;
    summary += `✅ Passed: ${passed}/${total}\n`;
    summary += `❌ Failed: ${failed}/${total}\n\n`;

    this.testResults.forEach((result) => {
      const icon = result.passed ? "✅" : "❌";
      summary += `${icon} ${result.test}\n`;
      if (!result.passed && result.error) {
        summary += `   Error: ${result.error.message}\n`;
      }
    });

    return summary;
  }
}

/**
 * Quick integration test function for browser console
 */
export async function runTripRefetchingTests(
  queryClient: QueryClient,
): Promise<void> {
  const testSuite = new TripRefetchingIntegrationTest(queryClient);
  const results = await testSuite.runAllTests();

  console.log(testSuite.getTestSummary());

  if (results.failed > 0) {
    console.error("Some integration tests failed. Check the results above.");
  } else {
    console.log("🎉 All integration tests passed!");
  }
}

/**
 * Add integration test utilities to global debug utils
 */
export function addIntegrationTestsToGlobal(queryClient: QueryClient): void {
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    (window as any).tripDebug = {
      ...(window as any).tripDebug,
      runTests: () => runTripRefetchingTests(queryClient),
      testSuite: new TripRefetchingIntegrationTest(queryClient),
    };
  }
}
