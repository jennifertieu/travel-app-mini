import { useMatch } from '@tanstack/react-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Locate } from 'lucide-react';
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
import { ChatPanel, type InitialSuggestions } from '../components/chat';
import { AiTripAssistant } from '../components/map/AiTripAssistant';
import { MobileTabBar, type MobileTab } from '../components/MobileTabBar';
import { getAllActivitiesWithStatus, parseDurationBucket } from '../lib/utils';
import type { Activity, ItineraryData } from '../types/itinerary';
import type { SuggestionCardData } from '../services/duringTripService';

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
  const tripRouteMatch = useMatch({ from: '/trip/$tripId', shouldThrow: false });
  const [storedTripId, setStoredTripId] = useState<string | null>(getStoredTripId);

  useEffect(() => {
    const handler = (e: Event) => {
      const { tripId: newId } = (e as CustomEvent<{ tripId: string }>).detail;
      if (newId) setStoredTripId(newId);
    };
    window.addEventListener('currentTripChanged', handler);
    return () => window.removeEventListener('currentTripChanged', handler);
  }, []);

  const tripId = (tripRouteMatch as any)?.params?.tripId || storedTripId;

  return (
    <ActiveTripViewInner key={tripId ?? 'no-trip'} />
  );
}

function ActiveTripViewInner() {
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
  const [focusedActivity, setFocusedActivity] = useState<Activity | null>(null);
  const [activeTab, setActiveTab] = useState<MobileTab>('map');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [initialSuggestions, setInitialSuggestions] = useState<InitialSuggestions | null>(null);
  const [locateTrigger, setLocateTrigger] = useState(0);

  const handleAskWithSuggestions = useCallback((suggestions: SuggestionCardData[], contextSummary: string | null) => {
    setInitialSuggestions({ suggestions, contextSummary, _ts: Date.now() });
    setIsChatOpen(true);
  }, []);

  const handleMobileAskWithSuggestions = useCallback((suggestions: SuggestionCardData[], contextSummary: string | null) => {
    setInitialSuggestions({ suggestions, contextSummary, _ts: Date.now() });
    setActiveTab('ask-ai');
  }, []);

  // Location payload for chat & AI assistant
  const chatLocation = useMemo(() => {
    return position
      ? { lat: position.latitude, lng: position.longitude, accuracy_meters: position.accuracy }
      : null;
  }, [position]);

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

  const refetchItinerary = useCallback(() => {
    if (!tripId) return;
    supabase
      .from("trip_itineraries")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setItinerary(data as Itinerary);
      });
  }, [tripId]);

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

  // Parse the itinerary JSON into typed data, normalizing server field names
  const itineraryData: ItineraryData | null = useMemo(() => {
    if (!itinerary?.itinerary) return null;
    try {
      const raw = itinerary.itinerary as Record<string, unknown>;
      const inner = (raw.itinerary ?? raw) as Record<string, unknown>;
      if (inner.days && Array.isArray(inner.days)) {
        const parsed = inner as unknown as ItineraryData;
        for (const day of parsed.days) {
          if (!day.day_number && (day as any).day) {
            day.day_number = (day as any).day;
          }
          for (const act of day.activities) {
            if (!act.title && (act as any).name) {
              act.title = (act as any).name;
            }
            if (!act.duration_minutes || isNaN(act.duration_minutes)) {
              act.duration_minutes = parseDurationBucket(
                (act as any).duration_bucket,
              );
            }
          }
        }
        if (inner.budget) parsed.budget = inner.budget as any;
        if (inner.flights) parsed.flights = inner.flights as any;
        if (inner.hotel !== undefined) parsed.hotel = inner.hotel as any;
        return parsed;
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

  const allActivitiesWithStatus = useMemo(
    () => (itineraryData ? getAllActivitiesWithStatus(itineraryData, undefined) : []),
    [itineraryData],
  );
  const enrichmentMap = usePlacesEnrichment(allActivities);

  // Compute current day number from trip dates
  const currentDayNumber = useMemo(() => {
    if (!itineraryData?.days?.length) return undefined;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const match = itineraryData.days.find((d) => d.date === todayStr);
    if (match) return match.day_number;
    // Fallback: find the closest day by date diff
    const sorted = [...itineraryData.days].sort(
      (a, b) => Math.abs(new Date(a.date).getTime() - now.getTime()) - Math.abs(new Date(b.date).getTime() - now.getTime()),
    );
    return sorted[0]?.day_number;
  }, [itineraryData]);

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
          {/* Desktop layout — conditionally chat | itinerary | map */}
          <div className="hidden md:flex flex-1 min-h-0" style={{ display: 'var(--dt-desktop-display, none)' }}>
            {isChatOpen && (
              <div className="w-[380px] border-r flex flex-col shrink-0">
                <ChatPanel tripId={tripId} itineraryRowId={itinerary?.id} location={chatLocation} initialSuggestions={initialSuggestions} demoTime={null} currentDayNumber={currentDayNumber} onItineraryUpdated={refetchItinerary} />
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              <ItineraryPanel
                data={itineraryData}
                tripId={tripId}
                itineraryRowId={itinerary?.id}
                onOpenActivity={setSelectedActivity}
                onLocateActivity={setFocusedActivity}
                isChatOpen={isChatOpen}
                onToggleChat={() => setIsChatOpen((p) => !p)}
              />
            </div>
            <div className="flex-1 relative">
              <MapPanel
                activities={allActivitiesWithStatus}
                annotations={annotations}
                userLocation={position}
                focusedActivity={focusedActivity}
                locateTrigger={locateTrigger}
              />
              <AiTripAssistant tripId={tripId} location={chatLocation} onAskPress={handleAskWithSuggestions} demoTime={null} currentDayNumber={currentDayNumber} onItineraryUpdated={refetchItinerary} />
              {position && (
                <button
                  type="button"
                  onClick={() => setLocateTrigger((n) => n + 1)}
                  className="absolute top-[90px] right-4 z-[500] w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
                  aria-label="Zoom to my location"
                >
                  <Locate className="w-5 h-5 text-gray-700" />
                </button>
              )}
              {selectedActivity && (
                <ActivityDetailModal
                  activity={selectedActivity}
                  enrichment={enrichmentMap.get(selectedActivity.title) ?? null}
                  onClose={() => setSelectedActivity(null)}
                />
              )}
            </div>
          </div>

          {/* Mobile: tab-based layout — reserve space at bottom for tab bar */}
          <div className="flex flex-col flex-1 min-h-0 md:hidden relative" style={{ paddingBottom: 'calc(60px)', display: 'var(--dt-mobile-display, flex)' }}>
            {/* Map tab */}
            {activeTab === 'map' && (
              <div className="flex-1 min-h-0 relative">
                <div className="w-full h-full">
                  <MapPanel
                    activities={allActivitiesWithStatus}
                    annotations={annotations}
                    userLocation={position}
                    focusedActivity={focusedActivity}
                    locateTrigger={locateTrigger}
                  />
                </div>
                <AiTripAssistant tripId={tripId} location={chatLocation} onAskPress={handleMobileAskWithSuggestions} demoTime={null} currentDayNumber={currentDayNumber} onItineraryUpdated={refetchItinerary} />
                {position && (
                  <button
                    type="button"
                    onClick={() => setLocateTrigger((n) => n + 1)}
                    className="absolute top-[90px] right-4 z-[500] w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
                    aria-label="Zoom to my location"
                  >
                    <Locate className="w-5 h-5 text-gray-700" />
                  </button>
                )}
                <MobileItinerarySheet
                  itineraryData={itineraryData}
                  onOpenActivity={setSelectedActivity}
                  onLocateActivity={setFocusedActivity}
                />
              </div>
            )}

            {/* List tab */}
            {activeTab === 'list' && (
              <div className="flex-1 min-h-0 flex flex-col">
                <ItineraryPanel
                  data={itineraryData}
                  tripId={tripId}
                  itineraryRowId={itinerary?.id}
                  onOpenActivity={setSelectedActivity}
                  onLocateActivity={setFocusedActivity}
                />
              </div>
            )}


            {/* Ask AI tab */}
            {activeTab === 'ask-ai' && (
              <div className="flex-1 min-h-0">
                <ChatPanel tripId={tripId} itineraryRowId={itinerary?.id} location={chatLocation} onClose={() => setActiveTab('map')} initialSuggestions={initialSuggestions} demoTime={null} currentDayNumber={currentDayNumber} onItineraryUpdated={refetchItinerary} />
              </div>
            )}

            {/* Activity detail works on both map and list tabs */}
            {selectedActivity && activeTab !== 'ask-ai' && (
              <ActivityDetailModal
                activity={selectedActivity}
                enrichment={enrichmentMap.get(selectedActivity.title) ?? null}
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

    </div>
  );
}
