import { useState, useEffect, useRef } from "react";
import { BACKEND_URL } from "../lib/api";
import type { Activity } from "../types";

export type Enrichment = {
  photoUrl: string | null;
  description: string | null;
};

export function usePlacesEnrichment(
  activities: Activity[],
): Map<string, Enrichment> {
  const [enrichmentMap, setEnrichmentMap] = useState<Map<string, Enrichment>>(
    new Map(),
  );
  // Track which activity names we've already fetched to avoid duplicate requests
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only fetch activities we haven't fetched yet
    const toFetch = activities.filter((a) => !fetchedRef.current.has(a.name));
    if (!toFetch.length) return;

    // Mark as fetched immediately to prevent duplicate requests
    for (const a of toFetch) fetchedRef.current.add(a.name);

    Promise.allSettled(
      toFetch.map(async (a) => {
        const params = new URLSearchParams({ name: a.name });
        if (a.latitude != null) params.set("lat", String(a.latitude));
        if (a.longitude != null) params.set("lng", String(a.longitude));
        const res = await fetch(
          `${BACKEND_URL}/places/activity-details?${params}`,
        );
        const data: Enrichment = await res.json();
        return { name: a.name, data };
      }),
    ).then((results) => {
      setEnrichmentMap((prev) => {
        const map = new Map(prev);
        for (const r of results) {
          if (r.status === "fulfilled") map.set(r.value.name, r.value.data);
        }
        return map;
      });
    });
  }, [activities]);

  return enrichmentMap;
}
