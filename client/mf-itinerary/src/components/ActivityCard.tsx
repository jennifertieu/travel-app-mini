import { MapPin, Clock, Camera, Check } from "lucide-react";
import { cn, computeDisplayTime, formatDuration } from "../lib/utils";
import type { Activity, ActivityLocation, TimeOfDay } from "../types";

/** Location can be a string (display address) or an object from the API (e.g. { lat, lng, name }). */
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

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex gap-3 rounded-lg border p-3 text-left transition-colors",
        "bg-card hover:bg-accent/50",
        isSelectionMode && isSelected
          ? "border-teal-500 ring-1 ring-teal-500"
          : "border-border",
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
                : "border-muted-foreground/40 bg-transparent",
            )}
          >
            {isSelected && <Check className="w-3.5 h-3.5" />}
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden">
        {(activity.place?.photoUrl ?? activity.image_url) ? (
          <img
            src={(activity.place?.photoUrl ?? activity.image_url)!}
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
          {formatLocation(activity.location)}
        </p>
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
          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-teal-600/10 text-teal-600 text-[10px] font-medium">
            <Camera className="w-3 h-3" />
            Must-Capture Moment
          </span>
        )}
      </div>
    </button>
  );
}
