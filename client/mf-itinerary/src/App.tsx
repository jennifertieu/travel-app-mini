import "./globals.css";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "./lib/supabase";
import { ItineraryPanel } from "./components/ItineraryPanel";
import { MapPanel } from "./components/MapPanel";
import { BuildingState } from "./components/BuildingState";
import { EmptyState } from "./components/EmptyState";
import { ActivityDetailModal } from "./components/ActivityDetailModal";
import { useAnnotations } from "./hooks/useAnnotations";
import { usePlacesEnrichment } from "./hooks/usePlacesEnrichment";
import type { Activity, ItineraryData } from "./types";

type Itinerary = {
  id: string;
  trip_id: string | null;
  itinerary: unknown;
  created_at: string;
  updated_at: string | null;
};

const getTripId = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get("tripId") || localStorage.getItem("current-trip-id");
};

const App = () => {
  const [tripId] = useState<string | null>(getTripId);
  const annotations = useAnnotations(tripId);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const fetchItinerary = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("trip_itineraries")
      .select("*")
      .eq("trip_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setItinerary(data as Itinerary);
      localStorage.removeItem("building-itinerary");
      setIsBuilding(false);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!tripId) return;

    const buildingTripId = localStorage.getItem("building-itinerary");
    if (buildingTripId === tripId) {
      setIsBuilding(true);
    }

    fetchItinerary(tripId);

    const channel = supabase
      .channel(`itinerary-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_itineraries",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log("Itinerary realtime update:", payload);
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            setItinerary(payload.new as Itinerary);
            setIsBuilding(false);
            localStorage.removeItem("building-itinerary");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchItinerary]);

  // Parse the itinerary JSON into typed data
  const itineraryData: ItineraryData | null = (() => {
    if (!itinerary?.itinerary) return null;
    try {
      const raw = itinerary.itinerary as Record<string, unknown>;
      // Support both { days: [...] } and { itinerary: { days: [...] } } shapes
      const inner = (raw.itinerary ?? raw) as Record<string, unknown>;
      if (inner.days && Array.isArray(inner.days)) {
        return inner as unknown as ItineraryData;
      }
      return null;
    } catch {
      return null;
    }
  })();

  const allActivities = useMemo(
    () => itineraryData?.days.flatMap((d) => d.activities) ?? [],
    [itineraryData]
  );
  const enrichmentMap = usePlacesEnrichment(allActivities);

  if (!tripId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <p className="text-sm text-muted-foreground">
          No trip selected. Go to Pre-Trip and click "Build Trip".
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {isBuilding && <BuildingState />}

      {isLoading && !isBuilding && (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading itinerary...</p>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-lg bg-red-950 text-red-300 text-sm">
          Error: {error}
        </div>
      )}

      {!isLoading && !itinerary && !isBuilding && <EmptyState />}

      {itineraryData && (
        <div className="flex flex-1 min-h-0">
          <div className="w-1/2 overflow-y-auto">
            <ItineraryPanel
              data={itineraryData}
              onOpenActivity={setSelectedActivity}
            />
          </div>
          <div className="w-1/2 relative">
            <MapPanel
              activities={itineraryData.days.flatMap((d) => d.activities)}
              annotations={annotations}
            />
            {selectedActivity && (
              <ActivityDetailModal
                activity={selectedActivity}
                enrichment={enrichmentMap.get(selectedActivity.name) ?? null}
                onClose={() => setSelectedActivity(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* Fallback: show raw JSON if data doesn't match expected shape */}
      {itinerary && !itineraryData && !isLoading && (
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-2">
            Raw itinerary data (unexpected format):
          </p>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[70vh] whitespace-pre-wrap break-words">
            {JSON.stringify(itinerary.itinerary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default App;
