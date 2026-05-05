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
      const [tripResult, collaboratorsResult] = await Promise.all([
        supabase.from("trips").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("trip_collaborators")
          .select("user_id")
          .eq("trip_id", id)
          .not("user_id", "is", null),
      ]);

      if (controller.signal.aborted) return;

      const trip = tripResult.data;
      if (!trip) {
        setSummary(null);
        return;
      }

      const collaboratorUserIds = (collaboratorsResult.data ?? []).map(
        (row) => row.user_id,
      );
      const creatorId = trip.created_by ?? null;
      const creatorInCollaborators =
        creatorId != null && collaboratorUserIds.includes(creatorId);
      const memberCount =
        (creatorId ? 1 : 0) +
        collaboratorUserIds.length -
        (creatorInCollaborators ? 1 : 0);

      const next: TripSummary = {
        id: trip.id,
        title: trip.title,
        destination: trip.destination,
        startDate: trip.start_date,
        endDate: trip.end_date,
        memberCount,
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

  // Listen for localStorage broadcasts (e.g. after settings save or cross-tab changes)
  useEffect(() => {
    const handleSummaryBroadcast = () => {
      const cached = readCachedSummary();
      if (cached) setSummary(cached);
      // Also refetch from backend to ensure we have latest (e.g. after settings save)
      const id = readTripId();
      if (id) fetchFromBackend(id);
    };

    window.addEventListener(SUMMARY_EVENT, handleSummaryBroadcast);
    window.addEventListener("storage", handleSummaryBroadcast);

    return () => {
      window.removeEventListener(SUMMARY_EVENT, handleSummaryBroadcast);
      window.removeEventListener("storage", handleSummaryBroadcast);
    };
  }, [fetchFromBackend]);

  return summary;
}
