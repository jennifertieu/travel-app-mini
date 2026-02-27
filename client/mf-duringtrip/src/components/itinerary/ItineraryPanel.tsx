import { useState, useMemo, useCallback } from "react";
import { DayTabs } from "./DayTabs";
import { TimeOfDaySection } from "./TimeOfDaySection";
import { TopToolbar } from "./TopToolbar";
import { BottomBar } from "./BottomBar";
import { groupActivitiesByTimeOfDay } from "../../lib/utils";
import type { Activity, ItineraryData, TimeOfDay } from "../../types/itinerary";

const TIME_OF_DAY_ORDER: TimeOfDay[] = ["morning", "afternoon", "evening"];

interface ItineraryPanelProps {
  data: ItineraryData;
  onOpenActivity: (activity: Activity) => void;
}

export function ItineraryPanel({ data, onOpenActivity }: ItineraryPanelProps) {
  const [activeDay, setActiveDay] = useState(data.days[0]?.day ?? 1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const currentDay = useMemo(
    () => data.days.find((d) => d.day === activeDay) ?? data.days[0],
    [data.days, activeDay],
  );

  const grouped = useMemo(
    () => (currentDay ? groupActivitiesByTimeOfDay(currentDay.activities) : null),
    [currentDay],
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
    // MVP no-op
    console.log("Delete selected:", [...selectedIds]);
  }, [selectedIds]);

  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode — clear selections
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const handleUndo = useCallback(() => {
    // MVP no-op
    console.log("Undo");
  }, []);

  const handleSave = useCallback(() => {
    // MVP no-op
    console.log("Save");
  }, []);

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
          days={data.days}
          activeDay={activeDay}
          onSelectDay={(day) => {
            setActiveDay(day);
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
          />
        ))}
      </div>

      {/* Bottom bar */}
      <BottomBar onUndo={handleUndo} onSave={handleSave} />
    </div>
  );
}
