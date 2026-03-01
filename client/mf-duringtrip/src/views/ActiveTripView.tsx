import { useMatch } from '@tanstack/react-router';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { DemoProvider, useDemoContext, type DemoLocation } from '../demo/DemoContext';
import { DemoBanner } from '../demo/DemoBanner';
import { getAllActivitiesWithStatus, groupActivitiesByTimeOfDay } from '../lib/utils';
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
  return (
    <DemoProvider>
      <ActiveTripViewInner />
    </DemoProvider>
  );
}

function ActiveTripViewInner() {
  const { isDemo, demoTime, setTripLocations, setTripDays } = useDemoContext();
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
  const [initialSuggestions, setInitialSuggestions] = useState<InitialSuggestions | null>(null);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const prevIsDemoRef = useRef(isDemo);

  // When demo mode is turned off, fly map to real user location
  useEffect(() => {
    const was = prevIsDemoRef.current;
    prevIsDemoRef.current = isDemo;
    if (was && !isDemo) {
      setLocateTrigger((n) => n + 1);
    }
  }, [isDemo]);

  const handleAskWithSuggestions = useCallback((suggestions: SuggestionCardData[], contextSummary: string | null) => {
    setInitialSuggestions({ suggestions, contextSummary });
  }, []);

  const handleMobileAskWithSuggestions = useCallback((suggestions: SuggestionCardData[], contextSummary: string | null) => {
    setInitialSuggestions({ suggestions, contextSummary });
    setActiveTab('ask-ai');
  }, []);

  // Location payload for chat
  const chatLocation = position
    ? { lat: position.latitude, lng: position.longitude, accuracy_meters: position.accuracy }
    : null;

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

  const allActivitiesWithStatus = useMemo(
    () => (itineraryData ? getAllActivitiesWithStatus(itineraryData, isDemo ? demoTime : undefined) : []),
    [itineraryData, isDemo, demoTime],
  );
  const enrichmentMap = usePlacesEnrichment(allActivities);

  // Populate demo location options from trip activities whenever itinerary loads
  useEffect(() => {
    if (!isDemo || !itineraryData) return;
    const SECTION_START_HOURS: Record<string, number> = { morning: 9, afternoon: 13, evening: 18 };
    const seen = new Set<string>();
    const locations: DemoLocation[] = [];
    for (const day of itineraryData.days) {
      const grouped = groupActivitiesByTimeOfDay(day.activities);
      for (const tod of ['morning', 'afternoon', 'evening'] as const) {
        let precedingMinutes = 0;
        for (const activity of grouped[tod]) {
          if (!seen.has(activity.name)) {
            let lat: number | null = null;
            let lng: number | null = null;
            if (typeof activity.latitude === 'number' && typeof activity.longitude === 'number') {
              lat = activity.latitude;
              lng = activity.longitude;
            } else if (activity.location && typeof activity.location === 'object') {
              const loc = activity.location as { lat?: number; lng?: number };
              if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
                lat = loc.lat;
                lng = loc.lng;
              }
            }
            if (lat !== null && lng !== null) {
              const startMinutes = SECTION_START_HOURS[tod] * 60 + precedingMinutes;
              locations.push({ name: activity.name, lat, lng, day: day.day, date: day.date, startMinutes });
              seen.add(activity.name);
            }
          }
          precedingMinutes += activity.duration_minutes;
        }
      }
    }
    setTripLocations(locations);
  }, [isDemo, itineraryData, setTripLocations]);

  // Populate demo day options from trip itinerary
  useEffect(() => {
    if (!isDemo || !itineraryData) return;
    setTripDays(itineraryData.days.map((d) => ({ day: d.day, date: d.date })));
  }, [isDemo, itineraryData, setTripDays]);

  return (
    <div className="relative flex flex-col" style={{ height: '100%' }}>
      <DemoBanner />
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
          {/* Desktop: 3-column layout — chat | itinerary | map */}
          <div className="hidden md:flex flex-1 min-h-0">
            <div className="w-[380px] border-r flex flex-col shrink-0">
              <ChatPanel tripId={tripId} location={chatLocation} initialSuggestions={initialSuggestions} />
            </div>
            <div className="flex-1 overflow-y-auto">
              <ItineraryPanel
                data={itineraryData}
                onOpenActivity={setSelectedActivity}
                onLocateActivity={setFocusedActivity}
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
              <AiTripAssistant tripId={tripId} location={chatLocation} onAskPress={handleAskWithSuggestions} />
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
                  enrichment={enrichmentMap.get(selectedActivity.name) ?? null}
                  onClose={() => setSelectedActivity(null)}
                />
              )}
            </div>
          </div>

          {/* Mobile: tab-based layout — reserve space at bottom for tab bar (60px + pb-safe) */}
          <div className="flex flex-col flex-1 min-h-0 md:hidden relative" style={{ paddingBottom: 'calc(60px)' }}>
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
                <AiTripAssistant tripId={tripId} location={chatLocation} onAskPress={handleMobileAskWithSuggestions} />
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
                  onOpenActivity={setSelectedActivity}
                  onLocateActivity={setFocusedActivity}
                />
              </div>
            )}

            {/* Ask AI tab */}
            {activeTab === 'ask-ai' && (
              <div className="flex-1 min-h-0">
                <ChatPanel tripId={tripId} location={chatLocation} onClose={() => setActiveTab('map')} initialSuggestions={initialSuggestions} />
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

    </div>
  );
}
