import { Sun, Sunset, Moon } from "lucide-react";
import { ActivityCard } from "./ActivityCard";
import { FreeTimeCard } from "./FreeTimeCard";
import { getActivityStatus } from "../../lib/utils";
import type { Activity, ActivitySpotlight, TimeOfDay, FreeTimeSlot } from "../../types/itinerary";

const SECTION_CONFIG: Record<
  TimeOfDay,
  { label: string; icon: typeof Sun }
> = {
  morning: { label: "Morning", icon: Sun },
  afternoon: { label: "Afternoon", icon: Sunset },
  evening: { label: "Evening", icon: Moon },
};

interface TimeOfDaySectionProps {
  timeOfDay: TimeOfDay;
  activities: Activity[];
  dayDate: string;
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onOpenActivity: (activity: Activity) => void;
  onLocateActivity?: (activity: Activity) => void;
  now?: Date;
  deletedSlots?: FreeTimeSlot[];
  spotlightMap?: Map<string, ActivitySpotlight>;
  onOpenGuide?: () => void;
}

export function TimeOfDaySection({
  timeOfDay,
  activities,
  dayDate,
  selectedIds,
  isSelectionMode,
  onToggleSelect,
  onOpenActivity,
  onLocateActivity,
  now,
  deletedSlots = [],
  spotlightMap,
  onOpenGuide,
}: TimeOfDaySectionProps) {
  const hasActivities = activities.length > 0;
  const hasSlots = deletedSlots.length > 0;

  if (!hasActivities && !hasSlots) return null;

  const { label, icon: Icon } = SECTION_CONFIG[timeOfDay];

  // All activities in this section deleted — show a single FreeTimeCard
  if (!hasActivities && hasSlots) {
    const totalFreed = deletedSlots.reduce((sum, s) => sum + s.freedMinutes, 0);
    return (
      <div className="mb-6">
        <div className="relative flex items-center gap-2 mb-3">
          <div className="absolute -left-8 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 border-2 border-teal-500 flex items-center justify-center z-10">
            <Icon className="w-3 h-3 text-teal-600 dark:text-teal-400" />
          </div>
          <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide">
            {label}
          </h3>
        </div>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 ml-[7px] w-2.5 h-2.5 rounded-full bg-teal-500/40 border-2 border-teal-500/60 z-10" />
            <FreeTimeCard freedMinutes={totalFreed} />
          </div>
        </div>
      </div>
    );
  }

  // Build a lookup of position → freedMinutes for quick access
  const slotsByPosition = new Map<number, number>();
  for (const slot of deletedSlots) {
    slotsByPosition.set(
      slot.position,
      (slotsByPosition.get(slot.position) ?? 0) + slot.freedMinutes,
    );
  }

  let precedingMinutes = 0;
  const items: React.ReactNode[] = [];

  for (let idx = 0; idx <= activities.length; idx++) {
    const freed = slotsByPosition.get(idx);
    if (freed) {
      items.push(
        <div key={`free-${timeOfDay}-${idx}`} className="relative">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 ml-[7px] w-2.5 h-2.5 rounded-full bg-teal-500/40 border-2 border-teal-500/60 z-10" />
          <FreeTimeCard freedMinutes={freed} />
        </div>,
      );
    }

    if (idx < activities.length) {
      const activity = activities[idx];
      const activityId = `${timeOfDay}-${idx}-${activity.title}`;
      const currentPreceding = precedingMinutes;
      precedingMinutes += activity.duration_minutes;

      const status = getActivityStatus(
        timeOfDay,
        idx,
        currentPreceding,
        activity.duration_minutes,
        dayDate,
        now,
      );

      items.push(
        <div key={activityId} className="relative">
          <div className="absolute -left-8 top-1/2 -translate-y-1/2 ml-[7px] w-2.5 h-2.5 rounded-full bg-teal-500/40 border-2 border-teal-500/60 z-10" />
          <ActivityCard
            activity={activity}
            timeOfDay={timeOfDay}
            indexInSection={idx}
            precedingMinutes={currentPreceding}
            isSelected={selectedIds.has(activityId)}
            isSelectionMode={isSelectionMode}
            status={status}
            onToggleSelect={() => onToggleSelect(activityId)}
            onOpen={() => onOpenActivity(activity)}
            onLocate={onLocateActivity ? () => onLocateActivity(activity) : undefined}
            spotlight={spotlightMap?.get(activity.title.trim().toLowerCase())}
            onOpenGuide={onOpenGuide}
          />
        </div>,
      );
    }
  }

  return (
    <div className="mb-6">
      <div className="relative flex items-center gap-2 mb-3">
        <div className="absolute -left-8 w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 border-2 border-teal-500 flex items-center justify-center z-10">
          <Icon className="w-3 h-3 text-teal-600 dark:text-teal-400" />
        </div>
        <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide">
          {label}
        </h3>
      </div>
      <div className="flex flex-col gap-2">{items}</div>
    </div>
  );
}
