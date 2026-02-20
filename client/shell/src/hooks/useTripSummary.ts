import { useState, useEffect, useCallback } from "react";

export interface TripSummary {
  id: string;
  title: string | null;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  memberCount: number;
}

const STORAGE_KEY = "trip-summary";
const SUMMARY_EVENT = "tripSummaryChanged";
const TRIP_CHANGED_EVENT = "currentTripChanged";

function readSummary(): TripSummary | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TripSummary;
  } catch {
    return null;
  }
}

/**
 * Reads the trip summary that mf-pretrip broadcasts via localStorage.
 * Re-reads on the tripSummaryChanged and currentTripChanged custom events.
 */
export function useTripSummary(): TripSummary | null {
  const [summary, setSummary] = useState<TripSummary | null>(readSummary);

  const refresh = useCallback(() => {
    setSummary(readSummary());
  }, []);

  useEffect(() => {
    const handleSummaryChanged = () => refresh();

    const handleTripChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ tripId: string | null }>).detail;
      if (!detail?.tripId) {
        setSummary(null);
      } else {
        refresh();
      }
    };

    window.addEventListener(SUMMARY_EVENT, handleSummaryChanged);
    window.addEventListener(TRIP_CHANGED_EVENT, handleTripChanged);
    window.addEventListener("storage", handleSummaryChanged);

    return () => {
      window.removeEventListener(SUMMARY_EVENT, handleSummaryChanged);
      window.removeEventListener(TRIP_CHANGED_EVENT, handleTripChanged);
      window.removeEventListener("storage", handleSummaryChanged);
    };
  }, [refresh]);

  return summary;
}
