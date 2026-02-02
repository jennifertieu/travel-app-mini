import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";

/**
 * Debounce utility for rapid trip switching
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Debug logger for trip cache operations
 */
class TripCacheLogger {
  private static instance: TripCacheLogger;
  private logs: Array<{
    timestamp: Date;
    level: "info" | "warn" | "error" | "debug";
    operation: string;
    tripId?: string;
    data?: any;
  }> = [];

  private readonly MAX_LOGS = 1000;

  static getInstance(): TripCacheLogger {
    if (!TripCacheLogger.instance) {
      TripCacheLogger.instance = new TripCacheLogger();
    }
    return TripCacheLogger.instance;
  }

  log(
    level: "info" | "warn" | "error" | "debug",
    operation: string,
    tripId?: string,
    data?: any,
  ) {
    const logEntry = {
      timestamp: new Date(),
      level,
      operation,
      tripId,
      data,
    };

    this.logs.push(logEntry);

    // Keep only the most recent logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Console output with formatting
    const prefix = `[TripCache${tripId ? `:${tripId}` : ""}]`;
    const message = `${prefix} ${operation}`;

    switch (level) {
      case "error":
        console.error(message, data);
        break;
      case "warn":
        console.warn(message, data);
        break;
      case "debug":
        console.debug(message, data);
        break;
      default:
        console.log(message, data);
    }
  }

  getLogs(
    tripId?: string,
    level?: "info" | "warn" | "error" | "debug",
  ): typeof this.logs {
    return this.logs.filter((log) => {
      if (tripId && log.tripId !== tripId) return false;
      if (level && log.level !== level) return false;
      return true;
    });
  }

  getRecentLogs(count: number = 50): typeof this.logs {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

/**
 * Loading state for trip-specific data components
 */
export interface TripLoadingState {
  tripId: string;
  isLoading: boolean;
  isSwitching: boolean;
  loadingComponents: {
    [componentName: string]: {
      isLoading: boolean;
      error: Error | null;
      lastUpdated: Date | null;
    };
  };
  overallError: Error | null;
}

/**
 * Batch operation for cache invalidation
 */
interface BatchOperation {
  type: "invalidate" | "prefetch";
  queryKey: readonly unknown[];
  tripId: string;
}

/**
 * Performance metrics for monitoring
 */
interface PerformanceMetrics {
  tripSwitchDuration: number;
  invalidationCount: number;
  prefetchCount: number;
  batchSize: number;
  timestamp: Date;
}
/**
 * Cache invalidation event for debugging and monitoring
 */
export interface CacheInvalidationEvent {
  type: "trip-switch" | "manual-refresh" | "error-retry";
  fromTripId: string | null;
  toTripId: string;
  timestamp: Date;
  affectedQueries: readonly unknown[][];
  success: boolean;
  errors?: Error[];
  performanceMetrics?: PerformanceMetrics;
}

/**
 * Trip Cache Manager - Handles comprehensive cache invalidation and data refetching
 * when switching between trips with performance optimizations
 */
export class TripCacheManager {
  private queryClient: QueryClient;
  private loadingStates = new Map<string, TripLoadingState>();
  private loadingStateListeners = new Set<(state: TripLoadingState) => void>();
  private eventListeners = new Set<(event: CacheInvalidationEvent) => void>();

  // Performance optimization properties
  private batchOperations = new Map<string, BatchOperation[]>();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // ms
  private readonly DEBOUNCE_DELAY = 100; // ms
  private readonly MAX_CONCURRENT_OPERATIONS = 5;

  // Debounced methods
  private debouncedSwitchTrip: (
    fromTripId: string | null,
    toTripId: string,
  ) => void;

  // Performance tracking
  private performanceMetrics = new Map<string, PerformanceMetrics>();

  // Debug logging
  private logger = TripCacheLogger.getInstance();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;

    // Initialize debounced methods
    this.debouncedSwitchTrip = debounce(
      (fromTripId: string | null, toTripId: string) => {
        this.executeSwitchTrip(fromTripId, toTripId);
      },
      this.DEBOUNCE_DELAY,
    );

    // Set up periodic cleanup of old metrics
    setInterval(
      () => {
        this.cleanupOldMetrics();
      },
      10 * 60 * 1000,
    ); // Clean up every 10 minutes
  }

  /**
   * Switch from one trip to another with comprehensive cache management
   * This method is debounced to handle rapid trip switching
   */
  async switchTrip(fromTripId: string | null, toTripId: string): Promise<void> {
    // Use debounced version to handle rapid switching
    this.debouncedSwitchTrip(fromTripId, toTripId);
  }

  /**
   * Execute the actual trip switch with performance optimizations
   */
  private async executeSwitchTrip(
    fromTripId: string | null,
    toTripId: string,
  ): Promise<void> {
    const startTime = Date.now();
    this.logger.log("info", "Starting trip switch", toTripId, {
      fromTripId,
      toTripId,
    });

    const event: CacheInvalidationEvent = {
      type: "trip-switch",
      fromTripId,
      toTripId,
      timestamp: new Date(),
      affectedQueries: [],
      success: false,
    };

    try {
      // Set switching state
      this.logger.log("debug", "Setting switching state", toTripId);
      this.setLoadingState(toTripId, {
        tripId: toTripId,
        isLoading: true,
        isSwitching: true,
        loadingComponents: {},
        overallError: null,
      });

      // Step 1: Batch invalidate previous trip data if exists
      if (fromTripId) {
        this.logger.log("info", "Invalidating previous trip data", fromTripId);
        const affectedQueries = await this.batchInvalidateTripData(fromTripId);
        event.affectedQueries = affectedQueries;
        this.logger.log("debug", "Invalidated queries", fromTripId, {
          count: affectedQueries.length,
        });
      }

      // Step 2: Optimized prefetch critical data for new trip
      this.logger.log("info", "Prefetching new trip data", toTripId);
      await this.optimizedPrefetchTripData(toTripId);

      // Step 3: Update loading state
      this.logger.log("debug", "Updating loading state to complete", toTripId);
      this.updateLoadingState(toTripId, {
        isSwitching: false,
        isLoading: false,
      });

      const duration = Date.now() - startTime;
      const metrics: PerformanceMetrics = {
        tripSwitchDuration: duration,
        invalidationCount: event.affectedQueries.length,
        prefetchCount: queryKeys.getAllTripKeys(toTripId).length,
        batchSize: this.batchOperations.get(toTripId)?.length || 0,
        timestamp: new Date(),
      };

      this.performanceMetrics.set(toTripId, metrics);
      event.performanceMetrics = metrics;
      event.success = true;

      this.logger.log("info", "Trip switch completed successfully", toTripId, {
        duration: `${duration}ms`,
        batchedOperations: metrics.batchSize,
        invalidatedQueries: metrics.invalidationCount,
        prefetchedQueries: metrics.prefetchCount,
      });
    } catch (error) {
      this.logger.log("error", "Trip switch failed", toTripId, error);
      event.errors = [error as Error];

      this.updateLoadingState(toTripId, {
        isSwitching: false,
        isLoading: false,
        overallError: error as Error,
      });
    } finally {
      this.notifyEventListeners(event);
    }
  }

  /**
   * Batch invalidate all cached data for a specific trip
   * Reduces React Query overhead by batching operations
   */
  private async batchInvalidateTripData(
    tripId: string,
  ): Promise<readonly unknown[][]> {
    try {
      this.logger.log("debug", "Starting batch invalidation", tripId);

      // Get all trip-specific query keys
      const tripKeys = queryKeys.getAllTripKeys(tripId);
      this.logger.log("debug", "Found trip keys for invalidation", tripId, {
        keyCount: tripKeys.length,
        keys: tripKeys,
      });

      // Add to batch operations
      const batchKey = `invalidate-${tripId}`;
      const operations: BatchOperation[] = tripKeys.map((queryKey) => ({
        type: "invalidate",
        queryKey,
        tripId,
      }));

      this.batchOperations.set(batchKey, operations);
      this.logger.log("debug", "Created batch operations", tripId, {
        batchKey,
        operationCount: operations.length,
      });

      // Execute batch with concurrency control
      await this.executeBatchOperations(batchKey);

      this.logger.log("info", "Batch invalidation completed", tripId, {
        invalidatedQueries: tripKeys.length,
      });
      return tripKeys;
    } catch (error) {
      this.logger.log("error", "Batch invalidation failed", tripId, error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async invalidateTripData(tripId: string): Promise<void> {
    await this.batchInvalidateTripData(tripId);
  }

  /**
   * Optimized prefetch critical trip data to improve user experience
   * Only prefetches essential data to avoid unnecessary network requests
   */
  private async optimizedPrefetchTripData(tripId: string): Promise<void> {
    try {
      console.log(`🎯 Optimized prefetching for trip ${tripId}`);

      // Only prefetch critical data that's immediately visible
      const criticalQueries = [
        queryKeys.trip(tripId),
        queryKeys.ideas(tripId),
        queryKeys.members(tripId),
      ];

      // Check if data already exists in cache and is fresh
      const needsPrefetch = criticalQueries.filter((queryKey) => {
        const queryState = this.queryClient.getQueryState(queryKey);
        const isStale =
          !queryState ||
          queryState.isStale ||
          (queryState.dataUpdatedAt &&
            Date.now() - queryState.dataUpdatedAt > 30000); // 30s
        return isStale;
      });

      if (needsPrefetch.length === 0) {
        console.log(`✅ All critical data is fresh for trip ${tripId}`);
        return;
      }

      // Batch prefetch operations with concurrency control
      const batchKey = `prefetch-${tripId}`;
      const operations: BatchOperation[] = needsPrefetch.map((queryKey) => ({
        type: "prefetch",
        queryKey,
        tripId,
      }));

      this.batchOperations.set(batchKey, operations);
      await this.executeBatchOperations(batchKey);

      console.log(
        `✅ Optimized prefetch completed for ${needsPrefetch.length} queries on trip ${tripId}`,
      );
    } catch (error) {
      console.error(
        `Failed to optimized prefetch trip data for ${tripId}:`,
        error,
      );
      // Don't throw here - prefetch failures shouldn't block trip switching
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async prefetchTripData(tripId: string): Promise<void> {
    await this.optimizedPrefetchTripData(tripId);
  }

  /**
   * Execute batch operations with concurrency control
   */
  private async executeBatchOperations(batchKey: string): Promise<void> {
    const operations = this.batchOperations.get(batchKey);
    if (!operations || operations.length === 0) return;

    try {
      // Process operations in chunks to control concurrency
      const chunks = this.chunkArray(
        operations,
        this.MAX_CONCURRENT_OPERATIONS,
      );

      for (const chunk of chunks) {
        const promises = chunk.map((operation) => {
          if (operation.type === "invalidate") {
            return this.queryClient.invalidateQueries({
              queryKey: operation.queryKey,
            });
          } else if (operation.type === "prefetch") {
            // For prefetch, just invalidate to force fresh data when needed
            return this.queryClient.invalidateQueries({
              queryKey: operation.queryKey,
            });
          }
          return Promise.resolve();
        });

        await Promise.allSettled(promises);
      }
    } finally {
      // Clean up batch operations
      this.batchOperations.delete(batchKey);
    }
  }

  /**
   * Utility method to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get performance metrics for a trip
   */
  getPerformanceMetrics(tripId: string): PerformanceMetrics | null {
    return this.performanceMetrics.get(tripId) || null;
  }

  /**
   * Get all performance metrics
   */
  getAllPerformanceMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Get debug logs for trip cache operations
   */
  getDebugLogs(
    tripId?: string,
    level?: "info" | "warn" | "error" | "debug",
  ): any[] {
    return this.logger.getLogs(tripId, level);
  }

  /**
   * Get recent debug logs
   */
  getRecentDebugLogs(count: number = 50): any[] {
    return this.logger.getRecentLogs(count);
  }

  /**
   * Export all debug logs as JSON string
   */
  exportDebugLogs(): string {
    return this.logger.exportLogs();
  }

  /**
   * Clear debug logs
   */
  clearDebugLogs(): void {
    this.logger.clearLogs();
  }

  /**
   * Get comprehensive debug information
   */
  getDebugInfo(tripId?: string): {
    currentLoadingStates: Array<[string, TripLoadingState]>;
    performanceMetrics: Array<[string, PerformanceMetrics]>;
    recentLogs: any[];
    batchOperations: Array<[string, BatchOperation[]]>;
    queryClientState?: any;
  } {
    const debugInfo = {
      currentLoadingStates: Array.from(this.loadingStates.entries()),
      performanceMetrics: Array.from(this.performanceMetrics.entries()),
      recentLogs: this.logger.getRecentLogs(20),
      batchOperations: Array.from(this.batchOperations.entries()),
    };

    if (tripId) {
      // Filter for specific trip
      return {
        ...debugInfo,
        currentLoadingStates: debugInfo.currentLoadingStates.filter(
          ([id]) => id === tripId,
        ),
        performanceMetrics: debugInfo.performanceMetrics.filter(
          ([id]) => id === tripId,
        ),
        recentLogs: debugInfo.recentLogs.filter(
          (log: any) => log.tripId === tripId,
        ),
        batchOperations: debugInfo.batchOperations.filter(([key]) =>
          key.includes(tripId),
        ),
      };
    }

    return debugInfo;
  }

  /**
   * Clear old performance metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [tripId, metrics] of this.performanceMetrics.entries()) {
      if (metrics.timestamp.getTime() < oneHourAgo) {
        this.performanceMetrics.delete(tripId);
      }
    }
  }
  getTripLoadingState(tripId: string): TripLoadingState {
    return (
      this.loadingStates.get(tripId) || {
        tripId,
        isLoading: false,
        isSwitching: false,
        loadingComponents: {},
        overallError: null,
      }
    );
  }

  /**
   * Subscribe to loading state changes
   */
  subscribeToLoadingStateChanges(
    callback: (state: TripLoadingState) => void,
  ): () => void {
    this.loadingStateListeners.add(callback);
    return () => this.loadingStateListeners.delete(callback);
  }

  /**
   * Subscribe to cache invalidation events
   */
  subscribeToEvents(
    callback: (event: CacheInvalidationEvent) => void,
  ): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /**
   * Manually refresh all data for a trip
   */
  async refreshTripData(tripId: string): Promise<void> {
    const event: CacheInvalidationEvent = {
      type: "manual-refresh",
      fromTripId: null,
      toTripId: tripId,
      timestamp: new Date(),
      affectedQueries: queryKeys.getAllTripKeys(tripId),
      success: false,
    };

    try {
      this.setLoadingState(tripId, {
        tripId,
        isLoading: true,
        isSwitching: false,
        loadingComponents: {},
        overallError: null,
      });

      await this.invalidateTripData(tripId);
      await this.prefetchTripData(tripId);

      this.updateLoadingState(tripId, {
        isLoading: false,
      });

      event.success = true;
    } catch (error) {
      event.errors = [error as Error];
      this.updateLoadingState(tripId, {
        isLoading: false,
        overallError: error as Error,
      });
    } finally {
      this.notifyEventListeners(event);
    }
  }

  /**
   * Retry failed queries for a trip
   */
  async retryFailedQueries(tripId: string): Promise<void> {
    const event: CacheInvalidationEvent = {
      type: "error-retry",
      fromTripId: null,
      toTripId: tripId,
      timestamp: new Date(),
      affectedQueries: [],
      success: false,
    };

    try {
      // Get all queries in error state for this trip
      const queryCache = this.queryClient.getQueryCache();
      const failedQueries = queryCache.getAll().filter((query) => {
        const tripId = queryKeys.extractTripId(query.queryKey);
        return tripId === tripId && query.state.status === "error";
      });

      event.affectedQueries = failedQueries.map((q) => q.queryKey);

      // Retry each failed query
      const retryPromises = failedQueries.map((query) =>
        this.queryClient.refetchQueries({ queryKey: query.queryKey }),
      );

      await Promise.allSettled(retryPromises);
      event.success = true;
    } catch (error) {
      event.errors = [error as Error];
    } finally {
      this.notifyEventListeners(event);
    }
  }

  /**
   * Set complete loading state for a trip
   */
  private setLoadingState(tripId: string, state: TripLoadingState): void {
    this.loadingStates.set(tripId, state);
    this.notifyLoadingStateListeners(state);
  }

  /**
   * Update partial loading state for a trip
   */
  private updateLoadingState(
    tripId: string,
    updates: Partial<TripLoadingState>,
  ): void {
    const currentState = this.getTripLoadingState(tripId);
    const newState = { ...currentState, ...updates };
    this.setLoadingState(tripId, newState);
  }

  /**
   * Notify all loading state listeners
   */
  private notifyLoadingStateListeners(state: TripLoadingState): void {
    this.loadingStateListeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error("Error in loading state listener:", error);
      }
    });
  }

  /**
   * Notify all event listeners
   */
  private notifyEventListeners(event: CacheInvalidationEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in event listener:", error);
      }
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Clear debounce timeouts
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Clear all maps and sets
    this.loadingStates.clear();
    this.loadingStateListeners.clear();
    this.eventListeners.clear();
    this.batchOperations.clear();
    this.performanceMetrics.clear();
  }
}

// Singleton instance for the app
let tripCacheManagerInstance: TripCacheManager | null = null;

/**
 * Get or create the singleton TripCacheManager instance
 */
export function getTripCacheManager(
  queryClient: QueryClient,
): TripCacheManager {
  if (!tripCacheManagerInstance) {
    tripCacheManagerInstance = new TripCacheManager(queryClient);
  }
  return tripCacheManagerInstance;
}
