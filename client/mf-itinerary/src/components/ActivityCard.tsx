import { MapPin, Clock, Camera, Check } from "lucide-react";
import { cn, computeDisplayTime, formatDuration } from "../lib/utils";
import type { Activity, ActivityLocation, TimeOfDay } from "../types";

function formatLocation(location: ActivityLocation | undefined): string {
  if (location == null) return "";
  if (typeof location === "string") return location;
  return location.name ?? location.address ?? "";
}

interface ActivityCardProps {
  activity: Activity;
  timeOfDay: TimeOfDay;
  indexInSection: number;
  precedingMinutes: number;
  isSelected: boolean;
  isSelectionMode: boolean;
  animationClass?: string;
  onToggleSelect: () => void;
  onOpen: () => void;
}

export function ActivityCard({
  activity,
  timeOfDay,
  indexInSection,
  precedingMinutes,
  isSelected,
  isSelectionMode,
  animationClass,
  onToggleSelect,
  onOpen,
}: ActivityCardProps) {
  const { startTime, endTime } = computeDisplayTime(
    timeOfDay,
    indexInSection,
    precedingMinutes,
    activity.duration_minutes,
  );

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect();
    } else {
      onOpen();
    }
  };

  const locationStr = formatLocation(activity.location);
  const imgSrc = activity.place?.photoUrl ?? activity.image_url;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex gap-3 rounded-xl border p-3 text-left transition-all",
        "bg-gray-50 dark:bg-zinc-800/60 hover:bg-gray-100 dark:hover:bg-zinc-700/60 shadow-sm",
        isSelectionMode && isSelected
          ? "border-teal-500 ring-1 ring-teal-500"
          : "border-gray-200 dark:border-zinc-700/60",
        animationClass,
      )}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <div className="flex-shrink-0 flex items-center">
          <div
            className={cn(
              "w-5 h-5 rounded border flex items-center justify-center transition-colors",
              isSelected
                ? "bg-teal-500 border-teal-500 text-white"
                : "border-gray-400 dark:border-zinc-500 bg-transparent",
            )}
          >
            {isSelected && <Check className="w-3.5 h-3.5" />}
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-gray-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={activity.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <MapPin className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {activity.name}
          </h4>
          {activity.cost_estimate != null && activity.cost_estimate > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex-shrink-0">
              ~${activity.cost_estimate}
            </span>
          )}
        </div>
        {locationStr && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {locationStr}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-nowrap min-w-0">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span className="whitespace-nowrap">
            {startTime} – {endTime}
          </span>
          <span className="text-muted-foreground/60 whitespace-nowrap">
            ({formatDuration(activity.duration_minutes)})
          </span>
        </div>
        {activity.must_capture && (
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-600/10 text-teal-700 dark:text-teal-400 text-[10px] font-medium">
            <Camera className="w-3 h-3" />
            Must-Capture
          </span>
        )}
      </div>
    </button>
  );
}
