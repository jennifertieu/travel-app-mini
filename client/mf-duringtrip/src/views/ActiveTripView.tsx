import { useMatch } from '@tanstack/react-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from '../hooks/useLocation';
import { useAnnotations } from '../hooks/useAnnotations';
import { usePlacesEnrichment } from '../hooks/usePlacesEnrichment';
import { supabase } from '../lib/supabase';
import { ItineraryPanel } from '../components/itinerary/ItineraryPanel';
import { MapPanel } from '../components/itinerary/MapPanel';
import { BuildingState } from '../components/itinerary/BuildingState';
import { EmptyState } from '../components/itinerary/EmptyState';
import { ActivityDetailModal } from '../components/itinerary/ActivityDetailModal';
import { MobileItinerarySheet } from '../components/itinerary/MobileItinerarySheet';
import { VoiceAssistant } from '../components/voice-assistant';
import { MobileTabBar, type MobileTab } from '../components/MobileTabBar';
import type { TripContext } from '../types/voice';
import type { Activity, ItineraryData } from '../types/itinerary';

type Itinerary = {
  id: string;
  trip_id: string | null;
  itinerary: unknown;
  created_at: string;
  updated_at: string | null;
};

const getStoredTripId = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get("tripId") || localStorage.getItem("current-trip-id");
};

export function ActiveTripView() {
  // Try route param first, fall back to query param / localStorage (same as mf-itinerary)
  const tripRouteMatch = useMatch({ from: '/trip/$tripId', shouldThrow: false });
  const [storedTripId] = useState<string | null>(getStoredTripId);
  const tripId = (tripRouteMatch as any)?.params?.tripId || storedTripId;
  const { position } = useLocation();
  const annotations = useAnnotations(tripId);

  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeTab, setActiveTab] = useState<MobileTab>('map');

  // Minimal trip context for voice assistant
  const tripContext: TripContext = {
    tripId,
    currentLocation: position
      ? { latitude: position.latitude, longitude: position.longitude }
      : undefined,
  };

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
  const itineraryData: ItineraryData | null = useMemo(() => {
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
  }, [itinerary]);

  const allActivities = useMemo(
    () => itineraryData?.days.flatMap((d) => d.activities) ?? [],
    [itineraryData],
  );
  const enrichmentMap = usePlacesEnrichment(allActivities);

  return (
    <div className="relative flex flex-col" style={{ height: '100%' }}>
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
        <>
          {/* Desktop: 50/50 split */}
          <div className="hidden md:flex flex-1 min-h-0">
            <div className="w-1/2 overflow-y-auto">
              <ItineraryPanel
                data={itineraryData}
                onOpenActivity={setSelectedActivity}
              />
            </div>
            <div className="w-1/2 relative">
              <MapPanel
                activities={allActivities}
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

          {/* Mobile: tab-based layout — reserve space at bottom for tab bar (60px + pb-safe) */}
          <div className="flex flex-col flex-1 min-h-0 md:hidden relative" style={{ paddingBottom: 'calc(60px + 1.25rem + env(safe-area-inset-bottom, 0px))' }}>
            {/* Map tab */}
            {activeTab === 'map' && (
              <div className="flex-1 min-h-0 relative">
                <div className="w-full h-full">
                  <MapPanel
                    activities={allActivities}
                    annotations={annotations}
                  />
                </div>
                <MobileItinerarySheet
                  itineraryData={itineraryData}
                  onOpenActivity={setSelectedActivity}
                />
              </div>
            )}

            {/* List tab */}
            {activeTab === 'list' && (
              <div className="flex-1 min-h-0 flex flex-col">
                <ItineraryPanel
                  data={itineraryData}
                  onOpenActivity={setSelectedActivity}
                />
              </div>
            )}

            {/* Ask AI tab */}
            {activeTab === 'ask-ai' && (
              <div className="flex-1 min-h-0">
                <VoiceAssistant
                  tripContext={tripContext}
                  autoExpand={true}
                  hideButton={true}
                />
              </div>
            )}

            {/* Activity detail works on both map and list tabs */}
            {selectedActivity && activeTab !== 'ask-ai' && (
              <ActivityDetailModal
                activity={selectedActivity}
                enrichment={enrichmentMap.get(selectedActivity.name) ?? null}
                onClose={() => setSelectedActivity(null)}
              />
            )}

            <MobileTabBar activeTab={activeTab} onChangeTab={setActiveTab} />
          </div>
        </>
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

      {/* Voice assistant floating overlay — desktop only */}
      <div className="hidden md:block">
        <VoiceAssistant tripContext={tripContext} />
      </div>
    </div>
  );
}
