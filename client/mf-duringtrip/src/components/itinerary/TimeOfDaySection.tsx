import { Sun, Sunset, Moon } from "lucide-react";
import { ActivityCard } from "./ActivityCard";
import type { Activity, TimeOfDay } from "../../types/itinerary";

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
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onOpenActivity: (activity: Activity) => void;
}

export function TimeOfDaySection({
  timeOfDay,
  activities,
  selectedIds,
  isSelectionMode,
  onToggleSelect,
  onOpenActivity,
}: TimeOfDaySectionProps) {
  if (activities.length === 0) return null;

  const { label, icon: Icon } = SECTION_CONFIG[timeOfDay];

  let precedingMinutes = 0;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-teal-600 uppercase tracking-wide">
          {label}
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {activities.map((activity, idx) => {
          const activityId = `${timeOfDay}-${idx}-${activity.name}`;
          const currentPreceding = precedingMinutes;
          precedingMinutes += activity.duration_minutes;

          return (
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
            />
          );
        })}
      </div>
    </div>
  );
}
