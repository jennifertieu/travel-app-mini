import { useState, useMemo, useCallback } from "react";
import { DayTabs } from "./DayTabs";
import { TimeOfDaySection } from "./TimeOfDaySection";
import { TopToolbar } from "./TopToolbar";
import { BottomBar } from "./BottomBar";
import { PhotoGuideModal } from "./PhotoGuideModal";
import { groupActivitiesByTimeOfDay } from "../lib/utils";
import { useItineraryDeletion } from "../hooks/useItineraryDeletion";
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
}

export function ItineraryPanel({
  data,
  tripId,
  itineraryRowId,
  onOpenActivity,
}: ItineraryPanelProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);

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

      // Walk through original activities; for each deleted one, create a FreeTimeSlot
      // at the position it would appear relative to remaining activities
      let localIdx = 0;
      for (let origIdx = 0; origIdx < origActivities.length; origIdx++) {
        const orig = origActivities[origIdx];
        if (
          localNames.has(orig.name) &&
          localIdx < localActivities.length &&
          localActivities[localIdx]?.name === orig.name
        ) {
          // This activity still exists — advance local pointer
          localIdx++;
        } else if (!localActivities.some((a) => a.name === orig.name)) {
          // This activity was deleted — create a free time slot at current localIdx position
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

  if (!currentDay || !grouped) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 pt-4 pb-2">
        {data.destination && (
          <h1 className="text-lg font-bold text-foreground px-4 mb-3">
            {data.trip_name || data.destination}
          </h1>
        )}
        <DayTabs
          days={localDays}
          activeDayIndex={activeDayIndex}
          onSelectDay={(index) => {
            setActiveDayIndex(index);
            setSelectedIds(new Set());
          }}
        />
      </div>

      {/* Toolbar */}
      <TopToolbar
        selectedCount={selectedIds.size}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
        onSelectAll={handleSelectAll}
        onDelete={handleDelete}
        onOpenPhotoGuide={() => setShowPhotoGuide(true)}
      />

      {/* Photo Guide modal */}
      <PhotoGuideModal
        open={showPhotoGuide}
        onClose={() => setShowPhotoGuide(false)}
        tripId={tripId}
        dayNumber={activeDay}
      />

      {/* Scrollable activities */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
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
      </div>

      {/* Bottom bar */}
      <BottomBar
        onUndo={handleUndo}
        onSave={handleSave}
        canUndo={canUndo}
        isSaving={isSaving}
        saveError={saveError}
      />
    </div>
  );
}
