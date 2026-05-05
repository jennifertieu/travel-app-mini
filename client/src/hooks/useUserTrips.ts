// NOTE: This is the shell's legacy implementation (useState/useEffect).
// Phase 5 Task 28 replaces this with the mf-pretrip React Query version.

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface Trip {
  id: string;
  title: string | null;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
}

export function useUserTrips(profileId: string | null) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!profileId) {
      setTrips([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: ownedTrips, error: ownedError } = await supabase
        .from("trips")
        .select("id, title, destination, start_date, end_date, created_by")
        .eq("created_by", profileId)
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

      const { data: collabRows, error: collabError } = await supabase
        .from("trip_collaborators")
        .select("trip_id")
        .eq("user_id", profileId);

      if (collabError) throw collabError;

      const collabTripIds = (collabRows || [])
        .map((r) => r.trip_id)
        .filter((id) => !(ownedTrips || []).some((t) => t.id === id));

      let collabTrips: Trip[] = [];
      if (collabTripIds.length > 0) {
        const { data, error } = await supabase
          .from("trips")
          .select("id, title, destination, start_date, end_date, created_by")
          .in("id", collabTripIds)
          .order("created_at", { ascending: false });
        if (!error) collabTrips = data || [];
      }

      const all = [...(ownedTrips || []), ...collabTrips];
      setTrips(all);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to load trips"));
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return { data: trips, isLoading: loading, error };
}
