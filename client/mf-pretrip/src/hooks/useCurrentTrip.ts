import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTrip } from "./useTrip";
import { Database } from "@travel-app/shared-types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

const CURRENT_TRIP_KEY = "current-trip-id";

/**
 * Enhanced hook for managing the current trip with localStorage persistence
 * Extends the existing useTrip hook with trip switching and cache invalidation
 */
export function useCurrentTrip() {
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [isLocalStorageAvailable, setIsLocalStorageAvailable] = useState(true);
  const queryClient = useQueryClient();

  // Use the existing useTrip hook to fetch trip data
  const { data: currentTrip, isLoading, error } = useTrip(currentTripId);

  // Initialize trip ID from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const storedTripId = localStorage.getItem(CURRENT_TRIP_KEY);
        setCurrentTripId(storedTripId);
      }
    } catch (error) {
      console.warn(
        "localStorage unavailable, continuing without persistence:",
        error,
      );
      setIsLocalStorageAvailable(false);
    }
  }, []);

  /**
   * Set the current trip and persist to localStorage
   * Invalidates trip-specific caches when switching trips
   */
  const setCurrentTrip = useCallback(
    (tripId: string) => {
      const previousTripId = currentTripId;

      // Update state immediately
      setCurrentTripId(tripId);

      // Persist to localStorage if available
      if (isLocalStorageAvailable) {
        try {
          localStorage.setItem(CURRENT_TRIP_KEY, tripId);
        } catch (error) {
          console.warn("Failed to persist trip ID to localStorage:", error);
          setIsLocalStorageAvailable(false);
        }
      }

      // Invalidate trip-specific data caches when switching trips
      if (previousTripId && previousTripId !== tripId) {
        // Invalidate ideas cache for the previous trip
        queryClient.invalidateQueries({
          queryKey: ["ideas", previousTripId],
        });

        // Invalidate suggestions cache for the previous trip
        queryClient.invalidateQueries({
          queryKey: ["suggestions", previousTripId],
        });

        // Remove generating suggestions flag when switching trips
        if (isLocalStorageAvailable) {
          try {
            localStorage.removeItem("generating-suggestions");
          } catch (error) {
            console.warn(
              "Failed to remove generating-suggestions flag:",
              error,
            );
          }
        }
      }

      // Prefetch the new trip data
      queryClient.prefetchQuery({
        queryKey: ["trip", tripId],
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    },
    [currentTripId, isLocalStorageAvailable, queryClient],
  );

  /**
   * Clear the current trip selection
   */
  const clearCurrentTrip = useCallback(() => {
    setCurrentTripId(null);

    if (isLocalStorageAvailable) {
      try {
        localStorage.removeItem(CURRENT_TRIP_KEY);
        localStorage.removeItem("generating-suggestions");
      } catch (error) {
        console.warn("Failed to clear trip data from localStorage:", error);
      }
    }
  }, [isLocalStorageAvailable]);

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

  return {
    currentTrip,
    currentTripId,
    setCurrentTrip,
    clearCurrentTrip,
    handleTripCreated,
    isLoading,
    error,
    isLocalStorageAvailable,
  };
}
