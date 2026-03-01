import { useState, useEffect } from "react";
import { BACKEND_URL } from "../lib/api";
import type { Activity } from "../types/itinerary";

export type Enrichment = { photoUrl: string | null; description: string | null };

export function usePlacesEnrichment(activities: Activity[]): Map<string, Enrichment> {
  const [enrichmentMap, setEnrichmentMap] = useState<Map<string, Enrichment>>(new Map());

  useEffect(() => {
    if (!activities.length) return;
    Promise.allSettled(
      activities.map(async (a) => {
        const params = new URLSearchParams({ name: a.name });
        if (a.latitude != null) params.set("lat", String(a.latitude));
        if (a.longitude != null) params.set("lng", String(a.longitude));
        const res = await fetch(`${BACKEND_URL}/places/activity-details?${params}`);
        const data: Enrichment = await res.json();
        return { name: a.name, data };
      })
    ).then((results) => {
      const map = new Map<string, Enrichment>();
      for (const r of results) {
        if (r.status === "fulfilled") map.set(r.value.name, r.value.data);
      }
      setEnrichmentMap(map);
    });
  }, [activities]);

  return enrichmentMap;
}
