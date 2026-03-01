import { MapPin, Clock, Camera, Locate } from "lucide-react";
import { cn, computeDisplayTime, formatDuration } from "../../lib/utils";
import type { ActivityStatus } from "../../lib/utils";
import type { Activity, ActivityLocation, TimeOfDay } from "../../types/itinerary";

/** Location can be a string (display address) or an object from the API (e.g. { lat, lng, name }). */
function formatLocation(location: ActivityLocation | undefined): string {
  if (location == null) return "";
  if (typeof location === "string") return location;
  return location.name ?? location.address ?? "";
}

function hasCoordinates(activity: Activity): boolean {
  if (activity.latitude != null && activity.longitude != null) return true;
  if (activity.location && typeof activity.location === "object") {
    return activity.location.lat != null && activity.location.lng != null;
  }
  return false;
}

interface ActivityCardProps {
  activity: Activity;
  timeOfDay: TimeOfDay;
  indexInSection: number;
  precedingMinutes: number;
  isSelected: boolean;
  isSelectionMode: boolean;
  status?: ActivityStatus;
  onToggleSelect: () => void;
  onOpen: () => void;
  onLocate?: () => void;
}

export function ActivityCard({
  activity,
  timeOfDay,
  indexInSection,
  precedingMinutes,
  isSelected,
  isSelectionMode,
  status,
  onToggleSelect,
  onOpen,
  onLocate,
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
          : status === "current"
            ? "border-teal-500 border-l-4 ring-1 ring-teal-500/30"
            : "border-border",
        status === "past" && "opacity-50",
      )}
    >
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
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {activity.name}
          </h4>
          {status === "current" && (
            <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wide">
              Now
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {formatLocation(activity.location)}
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

      {/* Locate on map button */}
      {onLocate && hasCoordinates(activity) && (
        <button
          type="button"
          aria-label="Show on map"
          onClick={(e) => {
            e.stopPropagation();
            onLocate();
          }}
          className="flex-shrink-0 self-center w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-teal-600 hover:bg-teal-600/10 transition-colors"
        >
          <Locate className="w-4 h-4" />
        </button>
      )}
    </button>
  );
}
