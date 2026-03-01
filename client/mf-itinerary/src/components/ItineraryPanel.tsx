import { useState, useMemo, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { getApiUrl } from "../lib/api";
import { supabase } from "../lib/supabase";
import { DayTabs } from "./DayTabs";
import { TimeOfDaySection } from "./TimeOfDaySection";
import { TopToolbar } from "./TopToolbar";
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
  const [budgetTabActive, setBudgetTabActive] = useState(false);
  const [travelTabActive, setTravelTabActive] = useState(false);
  const [guideTabActive, setGuideTabActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);

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

  const handleSave = useCallback(() => {
    save(itineraryRowId);
  }, [save, itineraryRowId]);

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
      // Realtime subscription in App.tsx will pick up the new itinerary
    } catch (err: any) {
      setRebuildError(err.message);
    } finally {
      setIsRebuilding(false);
    }
  }, [tripId, isRebuilding]);

  const handleRegenerateFlights = useCallback(async () => {
    if (!tripId || regenerating) return;
    setRegenerating(true);
    setRegenError(null);
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
      // Reload the page to pick up new flight data
      window.location.reload();
    } catch (err: any) {
      setRegenError(err.message);
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
      {/* Header */}
      <div className="flex-shrink-0 pt-4 pb-1">
        {data.destination && (
          <h1 className="text-lg font-bold text-gray-900 dark:text-white px-4 mb-3">
            {data.trip_name || data.destination}
          </h1>
        )}
        <DayTabs
          days={localDays}
          activeDayIndex={activeDayIndex}
          budgetTabActive={budgetTabActive}
          travelTabActive={travelTabActive}
          guideTabActive={guideTabActive}
          hasFlights={!!data.flights}
          onSelectDay={(index) => {
            setActiveDayIndex(index);
            setBudgetTabActive(false);
            setTravelTabActive(false);
            setGuideTabActive(false);
            setSelectedIds(new Set());
          }}
          onSelectBudget={() => {
            setBudgetTabActive(true);
            setTravelTabActive(false);
            setGuideTabActive(false);
            setSelectedIds(new Set());
            setIsSelectionMode(false);
          }}
          onSelectTravel={() => {
            setTravelTabActive(true);
            setBudgetTabActive(false);
            setGuideTabActive(false);
            setSelectedIds(new Set());
            setIsSelectionMode(false);
          }}
          onSelectGuide={() => {
            setGuideTabActive(true);
            setBudgetTabActive(false);
            setTravelTabActive(false);
            setSelectedIds(new Set());
            setIsSelectionMode(false);
          }}
        />
      </div>

      {budgetTabActive ? (
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
      ) : travelTabActive ? (
        /* Travel tab content */
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          <div className="text-center space-y-1 mb-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Travel overview
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              Flights & Logistics
            </p>
          </div>

          {data.flights ? (
            <>
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
            </>
          ) : (
            <div className="text-center py-8 text-sm text-gray-400">
              No flight data available
            </div>
          )}

          {/* Regenerate button */}
          <button
            type="button"
            onClick={handleRegenerateFlights}
            disabled={regenerating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`}
            />
            {regenerating ? "Searching flights…" : "Regenerate flights"}
          </button>
          {regenError && (
            <p className="text-xs text-red-500 text-center">{regenError}</p>
          )}

          {/* Hotel */}
          {data.hotel ? (
            <HotelCard hotel={data.hotel} />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800/40 p-4 text-center space-y-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                🏨 Hotel info coming soon
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Hotel search and booking details will appear here
              </p>
            </div>
          )}
        </div>
      ) : guideTabActive ? (
        /* Guide tab content */
        <div className="flex-1 overflow-y-auto">
          <TravelGuidePanel tripId={tripId} destination={data.destination} />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <TopToolbar
            selectedCount={selectedIds.size}
            isSelectionMode={isSelectionMode}
            onToggleSelectionMode={handleToggleSelectionMode}
            onSelectAll={handleSelectAll}
            onDelete={handleDelete}
            onOpenPhotoGuide={() => setShowPhotoGuide(true)}
            isChatOpen={isChatOpen}
            onToggleChatPanel={onToggleChat}
            onRebuildItinerary={handleRebuildItinerary}
            isRebuilding={isRebuilding}
          />
          {rebuildError && (
            <p className="text-xs text-red-500 px-4 py-1">{rebuildError}</p>
          )}

          {/* Photo Guide modal */}
          <PhotoGuideModal
            open={showPhotoGuide}
            onClose={() => setShowPhotoGuide(false)}
            tripId={tripId}
            dayNumber={activeDay}
          />

          {/* Scrollable activities */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {activeDayIndex === 0 && data.flights && (
              <div className="mb-4">
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
              <div className="mt-4">
                <FlightCard
                  direction="return"
                  flights={data.flights}
                  tripId={tripId}
                  onFlightSwap={handleFlightSwap}
                />
              </div>
            )}
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
