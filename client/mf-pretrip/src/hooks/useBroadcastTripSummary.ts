import { useEffect, useRef } from "react";
import { Database } from "@travel-app/shared-types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

export interface TripSummary {
  id: string;
  title: string | null;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  memberCount: number;
}

const STORAGE_KEY = "trip-summary";
const EVENT_NAME = "tripSummaryChanged";

export function broadcast(summary: TripSummary | null) {
  try {
    if (summary) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * Writes a lightweight trip summary to localStorage whenever the active trip
 * or its member list changes, so the shell header can display metadata without
 * querying Supabase itself.
 */
export function useBroadcastTripSummary(
  trip: Trip | null | undefined,
  memberCount: number,
) {
  const prevJson = useRef<string | null>(null);

  useEffect(() => {
    if (!trip) {
      if (prevJson.current !== null) {
        prevJson.current = null;
        broadcast(null);
      }
      return;
    }

    const isValidDate = (v: string | null): v is string =>
      !!v && !isNaN(new Date(v + "T00:00:00").getTime());

    const summary: TripSummary = {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: isValidDate(trip.start_date) ? trip.start_date : null,
      endDate: isValidDate(trip.end_date) ? trip.end_date : null,
      memberCount,
    };

    const json = JSON.stringify(summary);
    if (json !== prevJson.current) {
      prevJson.current = json;
      broadcast(summary);
    }
  }, [trip, memberCount]);

  useEffect(() => {
    return () => {
      // Don't clear on unmount -- the shell should keep showing the summary
      // even when navigating away from the pre-trip view.
    };
  }, []);
}
