import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTrip } from "./useTrip";
import { Database } from "@travel-app/shared-types";
import {
  getTripCacheManager,
  TripLoadingState,
} from "../services/TripCacheManager";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

const CURRENT_TRIP_KEY = "current-trip-id";

/**
 * Enhanced hook for managing the current trip with URL and localStorage persistence
 * Extends the existing useTrip hook with comprehensive cache management and trip switching
 */
export function useCurrentTrip() {
  const [currentTripId, setCurrentTripId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      const forceZero = localStorage.getItem("force-zero-state");
      if (forceZero === "true") return null;

      const urlTripId = new URLSearchParams(window.location.search).get(
        "tripId",
      );
      if (urlTripId) {
        localStorage.setItem(CURRENT_TRIP_KEY, urlTripId);
        return urlTripId;
      }

      return localStorage.getItem(CURRENT_TRIP_KEY);
    } catch {
      return null;
    }
  });
  const [isTripIdInitialized] = useState(true);
  const [isLocalStorageAvailable, setIsLocalStorageAvailable] = useState(true);
  const [loadingState, setLoadingState] = useState<TripLoadingState | null>(
    null,
  );
  const queryClient = useQueryClient();
  const tripCacheManager = getTripCacheManager(queryClient);

  // Use the existing useTrip hook to fetch trip data
  const { data: currentTrip, isLoading, error } = useTrip(currentTripId);

  // Subscribe to loading state changes from cache manager
  useEffect(() => {
    if (!currentTripId) return;

    console.log(
      `🎯 useCurrentTrip: Setting up loading state subscription for trip ${currentTripId}`,
    );

    const unsubscribe = tripCacheManager.subscribeToLoadingStateChanges(
      (state) => {
        if (state.tripId === currentTripId) {
          console.log(
            `🔄 useCurrentTrip: Loading state changed for trip ${currentTripId}:`,
            state,
          );
          setLoadingState(state);
        }
      },
    );

    // Get initial loading state
    const initialState = tripCacheManager.getTripLoadingState(currentTripId);
    setLoadingState(initialState);

    return unsubscribe;
  }, [currentTripId, tripCacheManager]);

  // Get trip ID from URL parameters
  const getTripIdFromUrl = useCallback(() => {
    if (typeof window === "undefined") return null;

    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("tripId");
  }, []);

  // Update URL with trip ID and notify other hook instances
  const updateUrlWithTripId = useCallback((tripId: string | null) => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (tripId) {
      url.searchParams.set("tripId", tripId);
    } else {
      url.searchParams.delete("tripId");
    }

    // Update URL without triggering a page reload
    window.history.replaceState({}, "", url.toString());

    // Notify other useCurrentTrip instances about the change
    window.dispatchEvent(
      new CustomEvent("currentTripChanged", { detail: { tripId } }),
    );
  }, []);

  // Clear stale trip ID when trip doesn't exist (deleted, or user lost access)
  // Prevents "Failed to load trip" when localStorage/URL references a removed trip
  // Must run after updateUrlWithTripId is defined
  useEffect(() => {
    if (
      currentTripId &&
      !isLoading &&
      !error &&
      currentTrip === null
    ) {
      console.warn(
        `Trip ${currentTripId} not found (deleted or inaccessible) — clearing stale reference`,
      );
      setCurrentTripId(null);
      updateUrlWithTripId(null);
      if (isLocalStorageAvailable) {
        try {
          localStorage.removeItem(CURRENT_TRIP_KEY);
        } catch (e) {
          /* ignore */
        }
      }
    }
  }, [
    currentTripId,
    currentTrip,
    isLoading,
    error,
    isLocalStorageAvailable,
    updateUrlWithTripId,
  ]);

  // Sync URL when trip ID came from localStorage (URL didn't have it)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const forceZero = localStorage.getItem("force-zero-state");
      if (forceZero === "true") {
        console.log("🧪 force-zero-state is set — skipping trip restore");
        return;
      }

      const urlTripId = getTripIdFromUrl();
      if (!urlTripId && currentTripId) {
        updateUrlWithTripId(currentTripId);
      }
    } catch (error) {
      console.warn(
        "localStorage unavailable, continuing without persistence:",
        error,
      );
      setIsLocalStorageAvailable(false);
    }
  }, [currentTripId, getTripIdFromUrl, updateUrlWithTripId]);

  // Listen for URL changes (browser back/forward) and cross-instance trip changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const urlTripId = getTripIdFromUrl();
      if (urlTripId !== currentTripId) {
        setCurrentTripId(urlTripId);
        if (urlTripId && isLocalStorageAvailable) {
          try {
            localStorage.setItem(CURRENT_TRIP_KEY, urlTripId);
          } catch (error) {
            console.warn("Failed to update localStorage on URL change:", error);
          }
        }
      }
    };

    const handleTripChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ tripId: string | null }>;
      const newTripId = customEvent.detail?.tripId ?? null;
      if (newTripId !== currentTripId) {
        setCurrentTripId(newTripId);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("currentTripChanged", handleTripChanged);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("currentTripChanged", handleTripChanged);
    };
  }, [currentTripId, getTripIdFromUrl, isLocalStorageAvailable]);

  /**
   * Set the current trip and persist to URL and localStorage
   * Uses comprehensive cache management for proper trip switching
   */
  const setCurrentTrip = useCallback(
    (tripId: string) => {
      const previousTripId = currentTripId;

      // Update state immediately for UI responsiveness
      console.log(
        `🎯 useCurrentTrip: Updating currentTripId from ${previousTripId} to ${tripId}`,
      );
      setCurrentTripId(tripId);

      // Update URL
      updateUrlWithTripId(tripId);

      // Persist to localStorage if available
      if (isLocalStorageAvailable) {
        try {
          localStorage.setItem(CURRENT_TRIP_KEY, tripId);
        } catch (error) {
          console.warn("Failed to persist trip ID to localStorage:", error);
          setIsLocalStorageAvailable(false);
        }
      }

      // Use Trip Cache Manager for comprehensive cache invalidation and data refetching
      // Run this asynchronously to not block UI updates
      if (previousTripId !== tripId) {
        (async () => {
          try {
            console.log(
              `🔄 Switching from trip ${previousTripId} to ${tripId}`,
            );
            await tripCacheManager.switchTrip(previousTripId, tripId);

            // Only remove generating flag when switching away from a trip (not creating one)
            // When previousTripId is null, we're creating a new trip - don't clear the flag
            // If pending-suggestion-input exists, a new trip was just created and needs generation
            if (isLocalStorageAvailable && previousTripId) {
              try {
                const hasPendingGeneration = localStorage.getItem(
                  "pending-suggestion-input",
                );
                if (!hasPendingGeneration) {
                  localStorage.removeItem("generating-suggestions");
                }
              } catch (error) {
                console.warn(
                  "Failed to check generating-suggestions flag:",
                  error,
                );
              }
            }
          } catch (error) {
            console.error("Failed to switch trip:", error);
            // Don't throw here - let the user continue even if cache management fails
          }
        })();
      }
    },
    [
      currentTripId,
      isLocalStorageAvailable,
      updateUrlWithTripId,
      tripCacheManager,
    ],
  );

  /**
   * Clear the current trip selection
   */
  const clearCurrentTrip = useCallback(() => {
    setCurrentTripId(null);

    // Clear URL parameter
    updateUrlWithTripId(null);

    if (isLocalStorageAvailable) {
      try {
        localStorage.removeItem(CURRENT_TRIP_KEY);
        localStorage.removeItem("generating-suggestions");
      } catch (error) {
        console.warn("Failed to clear trip data from localStorage:", error);
      }
    }
  }, [isLocalStorageAvailable, updateUrlWithTripId]);

  /**
   * Handle trip creation - automatically set as current trip
   */
  const handleTripCreated = useCallback(
    (newTrip: Trip) => {
      setCurrentTrip(newTrip.id);

      // Set generating suggestions flag for new trips
      if (isLocalStorageAvailable) {
        try {
          localStorage.setItem("generating-suggestions", "true");
        } catch (error) {
          console.warn("Failed to set generating-suggestions flag:", error);
        }
      }

      // Invalidate user trips cache to include the new trip
      queryClient.invalidateQueries({
        queryKey: ["user-trips"],
      });
    },
    [setCurrentTrip, isLocalStorageAvailable, queryClient],
  );

  /**
   * Manually refresh all data for the current trip
   */
  const refreshTripData = useCallback(async () => {
    if (!currentTripId) return;

    try {
      await tripCacheManager.refreshTripData(currentTripId);
    } catch (error) {
      console.error("Failed to refresh trip data:", error);
    }
  }, [currentTripId, tripCacheManager]);

  /**
   * Retry failed queries for the current trip
   */
  const retryFailedQueries = useCallback(async () => {
    if (!currentTripId) return;

    try {
      await tripCacheManager.retryFailedQueries(currentTripId);
    } catch (error) {
      console.error("Failed to retry failed queries:", error);
    }
  }, [currentTripId, tripCacheManager]);

  return {
    currentTrip,
    currentTripId,
    setCurrentTrip,
    clearCurrentTrip,
    handleTripCreated,
    isLoading,
    error,
    isLocalStorageAvailable,
    isTripIdInitialized,
    // Enhanced properties
    loadingState,
    isSwitching: loadingState?.isSwitching || false,
    // New methods
    refreshTripData,
    retryFailedQueries,
  };
}
