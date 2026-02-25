import { MapPin, Clock, Camera } from "lucide-react";
import { cn, computeDisplayTime, formatDuration } from "../lib/utils";
import type { Activity, TimeOfDay } from "../types";

interface ActivityCardProps {
  activity: Activity;
  timeOfDay: TimeOfDay;
  indexInSection: number;
  precedingMinutes: number;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function ActivityCard({
  activity,
  timeOfDay,
  indexInSection,
  precedingMinutes,
  isSelected,
  onToggleSelect,
}: ActivityCardProps) {
  const { startTime, endTime } = computeDisplayTime(
    timeOfDay,
    indexInSection,
    precedingMinutes,
    activity.duration_minutes,
  );

  return (
    <button
      type="button"
      onClick={onToggleSelect}
      className={cn(
        "w-full flex gap-3 rounded-lg border p-3 text-left transition-colors",
        "bg-card hover:bg-accent/50",
        isSelected
          ? "border-teal-500 ring-1 ring-teal-500"
          : "border-border",
      )}
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {activity.image_url ? (
          <img
            src={activity.image_url}
            alt={activity.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <MapPin className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground truncate">
          {activity.name}
        </h4>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {activity.location}
        </p>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>
            {startTime} – {endTime}
          </span>
          <span className="text-muted-foreground/60">
            ({formatDuration(activity.duration_minutes)})
          </span>
        </div>
        {activity.must_capture && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-teal-600/10 text-teal-600 text-[10px] font-medium">
            <Camera className="w-3 h-3" />
            Must-Capture Moment
          </span>
        )}
      </div>
    </button>
  );
}
