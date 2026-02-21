import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

export interface TripSummary {
  id: string;
  title: string | null;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  memberCount: number;
}

const STORAGE_KEY = "trip-summary";
const TRIP_ID_KEY = "current-trip-id";
const SUMMARY_EVENT = "tripSummaryChanged";
const TRIP_CHANGED_EVENT = "currentTripChanged";

function readCachedSummary(): TripSummary | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TripSummary;
  } catch {
    return null;
  }
}

function readTripId(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("tripId");
    if (fromUrl) return fromUrl;
    return localStorage.getItem(TRIP_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Fetches the current trip summary directly from Supabase so the shell
 * always has accurate data, even if mf-pretrip hasn't loaded yet.
 * Falls back to the localStorage cache for instant initial render.
 */
export function useTripSummary(): TripSummary | null {
  const [summary, setSummary] = useState<TripSummary | null>(readCachedSummary);
  const [tripId, setTripId] = useState<string | null>(readTripId);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFromBackend = useCallback(async (id: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [tripResult, membersResult] = await Promise.all([
        supabase.from("trips").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("trip_members")
          .select("id", { count: "exact", head: true })
          .eq("trip_id", id),
      ]);

      if (controller.signal.aborted) return;

      const trip = tripResult.data;
      if (!trip) {
        setSummary(null);
        return;
      }

      const next: TripSummary = {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        startDate: trip.start_date,
        endDate: trip.end_date,
        memberCount: membersResult.count ?? 0,
      };
      setSummary(next);
    } catch {
      // Network error — keep showing whatever we have (cached or null)
    }
  }, []);

  // Fetch from Supabase whenever the trip ID changes
  useEffect(() => {
    if (!tripId) {
      setSummary(null);
      return;
    }
    fetchFromBackend(tripId);
    return () => abortRef.current?.abort();
  }, [tripId, fetchFromBackend]);

  // Listen for trip switches and localStorage broadcasts
  useEffect(() => {
    const handleTripChanged = () => {
      const id = readTripId();
      setTripId(id);
    };

    const handleSummaryBroadcast = () => {
      const cached = readCachedSummary();
      if (cached) setSummary(cached);
    };

    window.addEventListener(TRIP_CHANGED_EVENT, handleTripChanged);
    window.addEventListener(SUMMARY_EVENT, handleSummaryBroadcast);
    window.addEventListener("storage", handleSummaryBroadcast);

    return () => {
      window.removeEventListener(TRIP_CHANGED_EVENT, handleTripChanged);
      window.removeEventListener(SUMMARY_EVENT, handleSummaryBroadcast);
      window.removeEventListener("storage", handleSummaryBroadcast);
    };
  }, []);

  return summary;
}
