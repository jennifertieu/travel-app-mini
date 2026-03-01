import { useState, useMemo, useCallback } from "react";
import { RefreshCw, CheckSquare, Trash2, Hotel, Plane } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from "../lib/api";
import { supabase } from "../lib/supabase";
import { DayTabs } from "./DayTabs";
import { SectionTabs, type Section } from "./SectionTabs";
import { TimeOfDaySection } from "./TimeOfDaySection";
import { BottomBar } from "./BottomBar";
import { PhotoGuideModal } from "./PhotoGuideModal";
import { BudgetSummary } from "./BudgetSummary";
import { TravelGuidePanel } from "./TravelGuidePanel";
import { DayTotalBar } from "./DayTotalBar";
import { FlightCard } from "./FlightCard";
import { HotelCard } from "./HotelCard";
import { groupActivitiesByTimeOfDay } from "../lib/utils";
import { calculateBudgetFromDays } from "../lib/budget-utils";
import { useItineraryDeletion } from "../hooks/useItineraryDeletion";
import { useTripMembers } from "../hooks/useTripMembers";
import type {
  Activity,
  ItineraryData,
  TimeOfDay,
  FreeTimeSlot,
} from "../types";

const TIME_OF_DAY_ORDER: TimeOfDay[] = ["morning", "afternoon", "evening"];

interface ItineraryPanelProps {
  data: ItineraryData;
  tripId: string | null;
  itineraryRowId: string;
  onOpenActivity: (activity: Activity) => void;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
}

export function ItineraryPanel({
  data,
  tripId,
  itineraryRowId,
  onOpenActivity,
  isChatOpen,
  onToggleChat,
}: ItineraryPanelProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<Section>("itinerary");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const { count: memberCount } = useTripMembers(tripId);

  // --- Deletion hook ---
  const {
    localDays,
    isSaving,
    saveError,
    deleteSelected,
    undo,
    save,
    hasUnsavedChanges,
    canUndo,
  } = useItineraryDeletion(data);

  // Use index-based day selection for reliability
  const currentDay = useMemo(
    () => localDays[activeDayIndex] ?? localDays[0],
    [localDays, activeDayIndex],
  );
  const activeDay = currentDay?.day ?? 1;

  // Original day for FreeTimeSlot comparison
  const originalDay = useMemo(
    () => data.days.find((d) => d.day === activeDay) ?? data.days[0],
    [data.days, activeDay],
  );

  const grouped = useMemo(
    () =>
      currentDay ? groupActivitiesByTimeOfDay(currentDay.activities) : null,
    [currentDay],
  );

  const originalGrouped = useMemo(
    () =>
      originalDay ? groupActivitiesByTimeOfDay(originalDay.activities) : null,
    [originalDay],
  );

  const allActivityIds = useMemo(() => {
    if (!grouped) return [];
    const ids: string[] = [];
    for (const tod of TIME_OF_DAY_ORDER) {
      grouped[tod].forEach((a, idx) => {
        ids.push(`${tod}-${idx}-${a.name}`);
      });
    }
    return ids;
  }, [grouped]);

  // --- Compute FreeTimeSlots by comparing original vs local activities ---
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
      const localNames = new Set(localActivities.map((a) => a.name));

      let localIdx = 0;
      for (let origIdx = 0; origIdx < origActivities.length; origIdx++) {
        const orig = origActivities[origIdx];
        if (
          localNames.has(orig.name) &&
          localIdx < localActivities.length &&
          localActivities[localIdx]?.name === orig.name
        ) {
          localIdx++;
        } else if (!localActivities.some((a) => a.name === orig.name)) {
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

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === allActivityIds.length) {
        return new Set();
      }
      return new Set(allActivityIds);
    });
  }, [allActivityIds]);

  const handleDelete = useCallback(() => {
    if (!grouped || selectedIds.size === 0) return;
    deleteSelected(selectedIds, activeDay, grouped);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [selectedIds, activeDay, grouped, deleteSelected]);

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleSave = useCallback(async () => {
    const toastId = toast.loading("Saving itinerary…");
    await save(itineraryRowId);
    // saveError is set by the hook if it failed
    if (saveError) {
      toast.error("Failed to save", { id: toastId });
    } else {
      toast.success("Itinerary saved", { id: toastId });
    }
  }, [save, itineraryRowId, saveError]);

  const handleFlightSwap = useCallback((_direction: string, _index: number) => {
    // FlightCard already PATCHed the server — next data refetch picks up the change
  }, []);

  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);

  const handleRebuildItinerary = useCallback(async () => {
    if (!tripId || isRebuilding) return;
    setIsRebuilding(true);
    setRebuildError(null);
    const toastId = toast.loading("Rebuilding itinerary…");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(getApiUrl(`/itinerary/${tripId}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to rebuild itinerary");
      }
      toast.success("Itinerary rebuilt!", { id: toastId });
      // Realtime subscription in App.tsx will pick up the new itinerary
    } catch (err: any) {
      setRebuildError(err.message);
      toast.error("Failed to rebuild itinerary", { id: toastId });
    } finally {
      setIsRebuilding(false);
    }
  }, [tripId, isRebuilding]);

  const handleRegenerateFlights = useCallback(async () => {
    if (!tripId || regenerating) return;
    setRegenerating(true);
    setRegenError(null);
    const toastId = toast.loading("Searching for flights…");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(
        getApiUrl(`/itinerary/${tripId}/flights/regenerate`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to regenerate flights");
      }
      toast.success("Flights updated!", { id: toastId });
      // Reload the page to pick up new flight data
      window.location.reload();
    } catch (err: any) {
      setRegenError(err.message);
      toast.error("Failed to regenerate flights", { id: toastId });
    } finally {
      setRegenerating(false);
    }
  }, [tripId, regenerating]);

  if (!currentDay || !grouped) return null;

  const budget = data.budget ?? calculateBudgetFromDays(data.days);

  // Day cost subtotals
  const dayActivityTotal = currentDay.activities.reduce(
    (sum, a) => sum + (a.cost_type !== "food" ? (a.cost_estimate ?? 0) : 0),
    0,
  );
  const dayFoodTotal = currentDay.activities.reduce(
    (sum, a) => sum + (a.cost_type === "food" ? (a.cost_estimate ?? 0) : 0),
    0,
  );
  const dayTransportTotal = currentDay.transport_estimate ?? 0;

  return (
    <div className="@container flex flex-col h-full">
      {/* Header: title left, section tabs right */}
      <div className="flex-shrink-0 h-11 flex items-center justify-between gap-4 px-4 border-b border-border">
        {data.destination && (
          <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate min-w-0">
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
          onOpenPhotoGuide={() => setActiveSection("photo")}
          onRebuildItinerary={handleRebuildItinerary}
          isRebuilding={isRebuilding}
          isChatOpen={isChatOpen}
          onToggleChatPanel={onToggleChat}
        />
      </div>

      {/* Tier 2: Day pills (itinerary and photo guide) */}
      {(activeSection === "itinerary" || activeSection === "photo") && (
        <div className="flex-shrink-0 pt-2 pb-1">
          <DayTabs
            days={localDays}
            activeDayIndex={activeDayIndex}
            onSelectDay={(index) => {
              setActiveDayIndex(index);
              if (activeSection === "itinerary") setSelectedIds(new Set());
            }}
          />
        </div>
      )}

      {activeSection === "budget" ? (
        /* Budget tab content */
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
        /* Travel tab content */
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Flights section header: title + trip total + refresh */}
          {(() => {
            const outbound = data.flights?.outbound?.[data.flights.selectedOutbound];
            const returnFlight = data.flights?.return?.[data.flights.selectedReturn];
            const tripTotal = outbound && returnFlight ? outbound.priceTotal + returnFlight.priceTotal : 0;
            return (
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Travel overview
                  </p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">
                    Flights & Logistics
                  </p>
                  {(data.destination || (data.days?.length && data.days[0]?.date)) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {data.destination ? `Flights and hotel for ${data.destination}` : "Your trip"}
                      {data.days?.length && data.days[0]?.date && data.days[data.days.length - 1]?.date && (
                        <>
                          {" · "}
                          {new Date(data.days[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" – "}
                          {new Date(data.days[data.days.length - 1].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tripTotal > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Total <span className="font-semibold text-foreground tabular-nums">${tripTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                    </span>
                  )}
                  {data.flights && (
                    <button
                      type="button"
                      onClick={handleRegenerateFlights}
                      disabled={regenerating}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                      title="Search for new flight options"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`}
                      />
                      {regenerating ? "Searching…" : "Refresh"}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          {regenError && (
            <p className="text-xs text-red-500 text-center -mt-0.5">{regenError}</p>
          )}

          {data.flights ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FlightCard
                direction="outbound"
                flights={data.flights}
                tripId={tripId}
                onFlightSwap={handleFlightSwap}
              />
              <FlightCard
                direction="return"
                flights={data.flights}
                tripId={tripId}
                onFlightSwap={handleFlightSwap}
              />
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-gray-400">
              No flight data available
            </div>
          )}

          {/* Accommodation section */}
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
        /* Guide tab content */
        <div className="flex-1 overflow-y-auto">
          <TravelGuidePanel tripId={tripId} destination={data.destination} />
        </div>
      ) : activeSection === "photo" ? (
        /* Photo Guide tab content */
        <div className="flex-1 min-h-0 flex flex-col">
          <PhotoGuideModal
            open
            onClose={() => setActiveSection("itinerary")}
            tripId={tripId}
            dayNumber={activeDay}
            inline
          />
        </div>
      ) : (
        <>
          {/* Selection mode bar (itinerary view only) */}
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
          {rebuildError && (
            <p className="text-xs text-red-500 px-4 py-1">{rebuildError}</p>
          )}

          {/* Scrollable activities */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="relative pl-8">
              {/* Continuous vertical timeline line */}
              <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-teal-500/30" />

              {activeDayIndex === 0 && data.flights && (
                <div className="relative mb-4">
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 border-2 border-teal-500 flex items-center justify-center z-10">
                    <Plane className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  </div>
                  <FlightCard
                    direction="outbound"
                    flights={data.flights}
                    tripId={tripId}
                    onFlightSwap={handleFlightSwap}
                  />
                </div>
              )}
              {TIME_OF_DAY_ORDER.map((tod) => (
                <TimeOfDaySection
                  key={tod}
                  timeOfDay={tod}
                  activities={grouped[tod]}
                  selectedIds={selectedIds}
                  isSelectionMode={isSelectionMode}
                  onToggleSelect={handleToggleSelect}
                  onOpenActivity={onOpenActivity}
                  deletedSlots={freeTimeSlotsBySection[tod]}
                />
              ))}
              {activeDayIndex === localDays.length - 1 && data.flights && (
                <div className="relative mt-4">
                  <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 border-2 border-teal-500 flex items-center justify-center z-10">
                    <Plane className="w-3 h-3 text-teal-600 dark:text-teal-400 rotate-90" />
                  </div>
                  <FlightCard
                    direction="return"
                    flights={data.flights}
                    tripId={tripId}
                    onFlightSwap={handleFlightSwap}
                  />
                </div>
              )}
            </div>
            <DayTotalBar
              activityTotal={dayActivityTotal}
              transportTotal={dayTransportTotal}
              foodTotal={dayFoodTotal}
            />
          </div>

          {/* Bottom bar */}
          <BottomBar
            onUndo={handleUndo}
            onSave={handleSave}
            canUndo={canUndo}
            isSaving={isSaving}
            saveError={saveError}
          />
        </>
      )}
    </div>
  );
}
