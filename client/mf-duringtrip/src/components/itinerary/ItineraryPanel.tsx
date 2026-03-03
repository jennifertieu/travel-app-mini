import { useState, useMemo, useCallback, useEffect } from "react";
import { CheckSquare, Trash2, RefreshCw, Hotel, Plane } from "lucide-react";
import { DayTabs } from "./DayTabs";
import { SectionTabs, type Section } from "./SectionTabs";
import { TimeOfDaySection } from "./TimeOfDaySection";
import { BottomBar } from "./BottomBar";
import { DayTotalBar } from "./DayTotalBar";
import { TransportLine } from "./TransportLine";
import { BudgetSummary } from "./BudgetSummary";
import { FlightCard } from "./FlightCard";
import { HotelCard } from "./HotelCard";
import { TravelGuidePanel } from "./TravelGuidePanel";
import { PhotoGuideModal } from "./PhotoGuideModal";
import { groupActivitiesByTimeOfDay, getCurrentDayNumber } from "../../lib/utils";
import { calculateBudgetFromDays } from "../../lib/budget-utils";
import { useDemoContext } from "../../demo/DemoContext";
import { useItineraryDeletion } from "../../hooks/useItineraryDeletion";
import { useTripMembers } from "../../hooks/useTripMembers";
import { useTravelGuide } from "../../hooks/useTravelGuide";
import { usePhotoGuide } from "../../hooks/usePhotoGuide";
import type {
  Activity,
  ActivitySpotlight,
  ActivitySpotlightsGuide,
  ItineraryData,
  TimeOfDay,
  FreeTimeSlot,
} from "../../types/itinerary";

const TIME_OF_DAY_ORDER: TimeOfDay[] = ["morning", "afternoon", "evening"];

interface ItineraryPanelProps {
  data: ItineraryData;
  tripId: string | null;
  itineraryRowId?: string;
  onOpenActivity: (activity: Activity) => void;
  onLocateActivity?: (activity: Activity) => void;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
}

export function ItineraryPanel({
  data,
  tripId,
  itineraryRowId,
  onOpenActivity,
  onLocateActivity,
  isChatOpen,
  onToggleChat,
}: ItineraryPanelProps) {
  const { isDemo, demoTime } = useDemoContext();
  const effectiveNow = isDemo ? demoTime : undefined;

  const [activeSection, setActiveSection] = useState<Section>("itinerary");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const { count: memberCount } = useTripMembers(tripId);
  const spotlightsGuide = useTravelGuide(tripId, "spotlights");

  const spotlightMap = useMemo(() => {
    const map = new Map<string, ActivitySpotlight>();
    const guide = spotlightsGuide.data as ActivitySpotlightsGuide | null;
    if (guide?.spotlights) {
      for (const s of guide.spotlights) {
        map.set(s.activity_name.trim().toLowerCase(), s);
      }
    }
    return map;
  }, [spotlightsGuide.data]);

  const deletion = useItineraryDeletion(data);

  const currentDayNumber = useMemo(
    () => getCurrentDayNumber(deletion.localDays, effectiveNow),
    [deletion.localDays, effectiveNow],
  );

  const [activeDay, setActiveDay] = useState(
    currentDayNumber ?? data.days[0]?.day_number ?? 1,
  );

  useEffect(() => {
    setActiveDay(currentDayNumber ?? data.days[0]?.day_number ?? 1);
  }, [currentDayNumber]);

  const currentDay = useMemo(
    () => deletion.localDays.find((d) => d.day_number === activeDay) ?? deletion.localDays[0],
    [deletion.localDays, activeDay],
  );

  const originalDay = useMemo(
    () => data.days.find((d) => d.day_number === activeDay) ?? data.days[0],
    [data.days, activeDay],
  );

  const photoGuide = usePhotoGuide(tripId, activeDay);

  const grouped = useMemo(
    () => (currentDay ? groupActivitiesByTimeOfDay(currentDay.activities) : null),
    [currentDay],
  );

  const originalGrouped = useMemo(
    () => (originalDay ? groupActivitiesByTimeOfDay(originalDay.activities) : null),
    [originalDay],
  );

  const allActivityIds = useMemo(() => {
    if (!grouped) return [];
    const ids: string[] = [];
    for (const tod of TIME_OF_DAY_ORDER) {
      grouped[tod].forEach((a, idx) => {
        ids.push(`${tod}-${idx}-${a.title}`);
      });
    }
    return ids;
  }, [grouped]);

  const freeTimeSlotsBySection = useMemo(() => {
    const result: Record<TimeOfDay, FreeTimeSlot[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    if (!originalGrouped || !grouped) return result;

    for (const tod of TIME_OF_DAY_ORDER) {
      const origActivities = originalGrouped[tod] ?? [];
      const localActivities = grouped[tod] ?? [];
      const localNames = new Set(localActivities.map((a) => a.title));

      let localIdx = 0;
      for (let origIdx = 0; origIdx < origActivities.length; origIdx++) {
        const orig = origActivities[origIdx];
        if (
          localNames.has(orig.title) &&
          localIdx < localActivities.length &&
          localActivities[localIdx]?.title === orig.title
        ) {
          localIdx++;
        } else if (!localActivities.some((a) => a.title === orig.title)) {
          result[tod].push({
            timeOfDay: tod,
            position: localIdx,
            freedMinutes: orig.duration_minutes ?? 60,
          });
        }
      }
    }
    return result;
  }, [originalGrouped, grouped]);

  const dayActivityTotal = currentDay?.activities.reduce(
    (sum, a) => sum + (a.cost_type !== "food" ? (a.cost_estimate ?? 0) : 0),
    0,
  ) ?? 0;
  const dayFoodTotal = currentDay?.activities.reduce(
    (sum, a) => sum + (a.cost_type === "food" ? (a.cost_estimate ?? 0) : 0),
    0,
  ) ?? 0;
  const dayTransportTotal = currentDay?.transport_estimate ?? 0;

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === allActivityIds.length) return new Set();
      return new Set(allActivityIds);
    });
  }, [allActivityIds]);

  const handleDelete = useCallback(() => {
    if (!grouped) return;
    deletion.deleteSelected(selectedIds, activeDay, grouped);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [selectedIds, activeDay, grouped, deletion]);

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!itineraryRowId) return;
    deletion.save(itineraryRowId);
  }, [itineraryRowId, deletion]);

  const handleFlightSwap = useCallback((_direction: string, _index: number) => {
    // FlightCard PATCHed the server; next data refetch picks up the change
  }, []);

  if (!currentDay || !grouped) return null;

  const budget = data.budget ?? calculateBudgetFromDays(data.days);

  return (
    <div className="flex flex-col h-full">
      {/* Header: title left, section tabs right */}
      <div className="flex-shrink-0 h-11 flex items-center justify-between gap-4 px-4 border-b border-border">
        {data.destination && (
          <h1 className="text-lg font-bold text-foreground truncate min-w-0">
            {data.trip_name || data.destination}
          </h1>
        )}
        <SectionTabs
          activeSection={activeSection}
          onSectionChange={(section) => {
            setActiveSection(section);
            setSelectedIds(new Set());
            if (section !== "itinerary") setIsSelectionMode(false);
          }}
          onToggleSelectionMode={handleToggleSelectionMode}
          isChatOpen={isChatOpen}
          onToggleChatPanel={onToggleChat}
        />
      </div>

      {/* Day tabs (itinerary and photo guide) */}
      {(activeSection === "itinerary" || activeSection === "photo") && (
        <div className="flex-shrink-0 pt-2 pb-1">
          <DayTabs
            days={deletion.localDays}
            activeDay={activeDay}
            currentDayNumber={currentDayNumber}
            onSelectDay={(day) => {
              setActiveDay(day);
              if (activeSection === "itinerary") setSelectedIds(new Set());
            }}
          />
        </div>
      )}

      {activeSection === "budget" ? (
        <div className="flex-1 overflow-y-auto">
          <BudgetSummary
            budget={budget}
            memberCount={memberCount}
            destination={data.destination}
            tripDays={data.days.length}
            tripId={tripId}
            days={data.days}
          />
        </div>
      ) : activeSection === "travel" ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {(() => {
            const outbound = data.flights?.outbound?.[data.flights.selectedOutbound];
            const returnFlight = data.flights?.return?.[data.flights.selectedReturn];
            const tripTotal =
              outbound && returnFlight
                ? outbound.priceTotal + returnFlight.priceTotal
                : 0;
            return (
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Travel overview
                  </p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    Flights & Logistics
                  </p>
                  {data.destination && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Flights and hotel for {data.destination}
                    </p>
                  )}
                </div>
                {tripTotal > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    Total{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      ${tripTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </span>
                )}
              </div>
            );
          })()}

          {data.flights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FlightCard direction="outbound" flights={data.flights} tripId={tripId} onFlightSwap={handleFlightSwap} />
              <FlightCard direction="return" flights={data.flights} tripId={tripId} onFlightSwap={handleFlightSwap} />
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-gray-400">No flight data available</div>
          )}

          <div className="pt-3 mt-4 border-t border-gray-200 dark:border-zinc-700/60 space-y-2">
            <div className="space-y-0.5">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Accommodation
              </p>
              <p className="text-base font-bold text-gray-900 dark:text-white">
                Where you&apos;re staying
              </p>
            </div>
            {data.hotel ? (
              <HotelCard hotel={data.hotel} />
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800/40 p-4 text-center space-y-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
                  <Hotel className="w-4 h-4" />
                  Hotel info coming soon
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Hotel search and booking details will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeSection === "guide" ? (
        <div className="flex-1 overflow-y-auto">
          <TravelGuidePanel tripId={tripId} destination={data.destination} />
        </div>
      ) : activeSection === "photo" ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <PhotoGuideModal
            open
            onClose={() => setActiveSection("itinerary")}
            dayNumber={activeDay}
            photoGuide={photoGuide}
            inline
          />
        </div>
      ) : (
        <>
          {/* Selection mode bar */}
          {isSelectionMode && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Select all
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete{selectedIds.size > 0 && ` (${selectedIds.size})`}
                </button>
                <button
                  type="button"
                  onClick={handleToggleSelectionMode}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {deletion.saveError && (
            <div className="mx-4 mt-2 px-3 py-2 rounded-md bg-red-950 text-red-300 text-xs">
              Save failed: {deletion.saveError}
            </div>
          )}

          {/* Scrollable activities with vertical timeline */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="relative pl-8">
              <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-teal-500/30" />

              {TIME_OF_DAY_ORDER.map((tod, todIdx) => (
                <div key={tod}>
                  <TimeOfDaySection
                    timeOfDay={tod}
                    activities={grouped[tod]}
                    dayDate={currentDay.date}
                    selectedIds={selectedIds}
                    isSelectionMode={isSelectionMode}
                    onToggleSelect={handleToggleSelect}
                    onOpenActivity={onOpenActivity}
                    onLocateActivity={onLocateActivity}
                    now={effectiveNow}
                    deletedSlots={freeTimeSlotsBySection[tod]}
                    spotlightMap={spotlightMap}
                    onOpenGuide={() => setActiveSection("guide")}
                  />
                  {todIdx < TIME_OF_DAY_ORDER.length - 1 &&
                    grouped[tod].length > 0 &&
                    grouped[TIME_OF_DAY_ORDER[todIdx + 1]]?.length > 0 &&
                    currentDay.transport_estimate != null &&
                    currentDay.transport_estimate > 0 && (
                      <TransportLine
                        estimate={currentDay.transport_estimate}
                        note={currentDay.transport_note}
                      />
                    )}
                </div>
              ))}
            </div>
            <DayTotalBar
              activityTotal={dayActivityTotal}
              transportTotal={dayTransportTotal}
              foodTotal={dayFoodTotal}
            />
          </div>

          <BottomBar
            onUndo={deletion.undo}
            onSave={handleSave}
            canUndo={deletion.canUndo}
            hasUnsavedChanges={deletion.hasUnsavedChanges}
            isSaving={deletion.isSaving}
          />
        </>
      )}
    </div>
  );
}
