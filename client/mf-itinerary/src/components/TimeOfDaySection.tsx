import { Sun, Sunset, Moon } from "lucide-react";
import { ActivityCard } from "./ActivityCard";
import { FreeTimeCard } from "./FreeTimeCard";
import type { Activity, TimeOfDay, FreeTimeSlot } from "../types";

const SECTION_CONFIG: Record<TimeOfDay, { label: string; icon: typeof Sun }> = {
  morning: { label: "Morning", icon: Sun },
  afternoon: { label: "Afternoon", icon: Sunset },
  evening: { label: "Evening", icon: Moon },
};

interface TimeOfDaySectionProps {
  timeOfDay: TimeOfDay;
  activities: Activity[];
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onOpenActivity: (activity: Activity) => void;
  deletedSlots?: FreeTimeSlot[];
}

export function TimeOfDaySection({
  timeOfDay,
  activities,
  selectedIds,
  isSelectionMode,
  onToggleSelect,
  onOpenActivity,
  deletedSlots = [],
}: TimeOfDaySectionProps) {
  const hasActivities = activities.length > 0;
  const hasSlots = deletedSlots.length > 0;

  // Nothing to render at all
  if (!hasActivities && !hasSlots) return null;

  const { label, icon: Icon } = SECTION_CONFIG[timeOfDay];

  // All activities deleted — show a single FreeTimeCard for the total freed time
  if (!hasActivities && hasSlots) {
    const totalFreed = deletedSlots.reduce((sum, s) => sum + s.freedMinutes, 0);
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide">
            {label}
          </h3>
        </div>
        <div className="flex flex-col gap-2">
          <FreeTimeCard freedMinutes={totalFreed} />
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
    // Insert free time card before this index if a slot exists here
    const freed = slotsByPosition.get(idx);
    if (freed) {
      items.push(
        <FreeTimeCard key={`free-${timeOfDay}-${idx}`} freedMinutes={freed} />,
      );
    }

    if (idx < activities.length) {
      const activity = activities[idx];
      const activityId = `${timeOfDay}-${idx}-${activity.name}`;
      const currentPreceding = precedingMinutes;
      precedingMinutes += activity.duration_minutes ?? 60;

      items.push(
        <ActivityCard
          key={activityId}
          activity={activity}
          timeOfDay={timeOfDay}
          indexInSection={idx}
          precedingMinutes={currentPreceding}
          isSelected={selectedIds.has(activityId)}
          isSelectionMode={isSelectionMode}
          onToggleSelect={() => onToggleSelect(activityId)}
          onOpen={() => onOpenActivity(activity)}
        />,
      );
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide">
          {label}
        </h3>
      </div>
      <div className="flex flex-col gap-2">{items}</div>
    </div>
  );
}
