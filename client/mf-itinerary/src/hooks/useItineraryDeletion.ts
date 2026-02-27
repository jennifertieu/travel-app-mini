import { useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";
import type { Json } from "@travel-app/shared-types";
import type {
  Activity,
  ItineraryData,
  ItineraryDay,
  TimeOfDay,
} from "../types";

/** A record of one deletion operation for undo support */
export interface DeletionEntry {
  dayNumber: number;
  activities: Array<{
    activity: Activity;
    timeOfDay: TimeOfDay;
    index: number;
  }>;
}

export interface UseItineraryDeletionReturn {
  localDays: ItineraryDay[];
  deletionStack: DeletionEntry[];
  isSaving: boolean;
  saveError: string | null;
  deleteSelected: (
    selectedIds: Set<string>,
    activeDay: number,
    grouped: Record<TimeOfDay, Activity[]>,
  ) => void;
  undo: () => void;
  save: (itineraryRowId: string) => Promise<void>;
  hasUnsavedChanges: boolean;
  canUndo: boolean;
}

const TIME_OF_DAY_ORDER: TimeOfDay[] = ["morning", "afternoon", "evening"];

export function useItineraryDeletion(
  initialData: ItineraryData,
): UseItineraryDeletionReturn {
  const [localDays, setLocalDays] = useState<ItineraryDay[]>(initialData.days);
  const [deletionStack, setDeletionStack] = useState<DeletionEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<ItineraryDay[]>(
    initialData.days,
  );

  // --- deleteSelected: removes selected activities, pushes to undo stack ---
  const deleteSelected = useCallback(
    (
      selectedIds: Set<string>,
      activeDay: number,
      grouped: Record<TimeOfDay, Activity[]>,
    ) => {
      if (selectedIds.size === 0) return;

      const removed: DeletionEntry["activities"] = [];

      for (const tod of TIME_OF_DAY_ORDER) {
        const activities = grouped[tod] ?? [];
        activities.forEach((activity, idx) => {
          const id = `${tod}-${idx}-${activity.name}`;
          if (selectedIds.has(id)) {
            removed.push({ activity, timeOfDay: tod, index: idx });
          }
        });
      }

      if (removed.length === 0) return;

      const entry: DeletionEntry = {
        dayNumber: activeDay,
        activities: removed,
      };
      setDeletionStack((prev) => [...prev, entry]);

      // Build a set of activity names to remove (keyed by timeOfDay + name)
      // Using name-based matching avoids stale-index bugs when React batches
      // multiple deletions before re-rendering.
      const removeByName = new Set(
        removed.map((r) => `${r.timeOfDay}::${r.activity.name}`),
      );

      setLocalDays((prev) =>
        prev.map((day) => {
          if (day.day !== activeDay) return day;

          const newActivities = day.activities.filter((a) => {
            const tod = a.time_of_day || "morning";
            return !removeByName.has(`${tod}::${a.name}`);
          });

          return { ...day, activities: newActivities };
        }),
      );
    },
    [],
  );

  // --- undo: pops last deletion and restores activities ---
  const undo = useCallback(() => {
    setDeletionStack((prev) => {
      if (prev.length === 0) return prev;

      const next = [...prev];
      const entry = next.pop()!;

      setLocalDays((days) =>
        days.map((day) => {
          if (day.day !== entry.dayNumber) return day;

          const byTod: Record<TimeOfDay, Activity[]> = {
            morning: [],
            afternoon: [],
            evening: [],
          };
          for (const a of day.activities) {
            const tod = a.time_of_day || "morning";
            byTod[tod].push(a);
          }

          // Re-insert each removed activity at its original index
          const sorted = [...entry.activities].sort(
            (a, b) => a.index - b.index,
          );
          for (const { activity, timeOfDay, index } of sorted) {
            const arr = byTod[timeOfDay];
            arr.splice(Math.min(index, arr.length), 0, activity);
          }

          const restored: Activity[] = [];
          for (const tod of TIME_OF_DAY_ORDER) {
            restored.push(...byTod[tod]);
          }

          return { ...day, activities: restored };
        }),
      );

      return next;
    });
  }, []);

  // --- save: persists modified itinerary to Supabase ---
  const save = useCallback(
    async (itineraryRowId: string) => {
      setIsSaving(true);
      setSaveError(null);

      try {
        const modifiedItinerary: ItineraryData = {
          ...initialData,
          days: localDays,
        };

        const { error } = await supabase
          .from("trip_itineraries")
          .update({
            itinerary: modifiedItinerary as unknown as Json,
            updated_at: new Date().toISOString(),
          })
          .eq("id", itineraryRowId);

        if (error) {
          setSaveError(error.message);
        } else {
          setDeletionStack([]);
          setSavedSnapshot(localDays);
        }
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setIsSaving(false);
      }
    },
    [initialData, localDays],
  );

  // --- derived state ---
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(localDays) !== JSON.stringify(savedSnapshot),
    [localDays, savedSnapshot],
  );

  const canUndo = deletionStack.length > 0;

  return {
    localDays,
    deletionStack,
    isSaving,
    saveError,
    deleteSelected,
    undo,
    save,
    hasUnsavedChanges,
    canUndo,
  };
}
