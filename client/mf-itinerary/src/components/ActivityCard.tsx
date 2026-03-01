import { useState } from "react";
import { MapPin, Clock, Camera, Check, Lightbulb, Wallet, AlertTriangle, BookOpen } from "lucide-react";
import { cn, computeDisplayTime, formatDuration } from "../lib/utils";
import type { Activity, ActivityLocation, TimeOfDay, ActivitySpotlight } from "../types";

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
  spotlight?: ActivitySpotlight;
  onOpenGuide?: () => void;
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
  spotlight,
  onOpenGuide,
}: ActivityCardProps) {
  const [tipExpanded, setTipExpanded] = useState(false);
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
    <>
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
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {spotlight && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTipExpanded((p) => !p);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                    tipExpanded
                      ? "bg-teal-600 text-white"
                      : "bg-teal-50 dark:bg-teal-600/10 text-teal-700 dark:text-teal-400",
                  )}
                  title="Toggle guide tips"
                >
                  <Lightbulb className="w-3 h-3" />
                  Tips
                </button>
              )}
              {activity.cost_estimate != null && activity.cost_estimate > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-xs font-medium">
                  ~${activity.cost_estimate}
                </span>
              )}
            </div>
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

      {tipExpanded && spotlight && (
        <div className="mt-1.5 rounded-lg border border-border bg-gray-50 dark:bg-zinc-800/50 p-3 space-y-2">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
            {spotlight.editorial_blurb}
          </p>
          <div className="space-y-1.5 pt-1 border-t border-border">
            {spotlight.best_time && (
              <div className="flex gap-2 items-center text-[11px] text-gray-700 dark:text-gray-300">
                <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                {spotlight.best_time}
              </div>
            )}
            {spotlight.budget_tip && (
              <div className="flex gap-2 items-center text-[11px] text-gray-700 dark:text-gray-300">
                <Wallet className="w-3 h-3 text-gray-400 flex-shrink-0" />
                {spotlight.budget_tip}
              </div>
            )}
            {spotlight.etiquette_tip && (
              <div className="flex gap-2 items-center text-[11px] text-gray-700 dark:text-gray-300">
                <AlertTriangle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                {spotlight.etiquette_tip}
              </div>
            )}
          </div>
          {onOpenGuide && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenGuide();
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 mt-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              See full guide
            </button>
          )}
        </div>
      )}
    </>
  );
}
