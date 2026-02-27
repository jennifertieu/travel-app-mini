import { useState, useMemo } from "react";
import { Navigation } from "lucide-react";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { DayTabs } from "./DayTabs";
import { TimeOfDaySection } from "./TimeOfDaySection";
import {
  computeDisplayTime,
  groupActivitiesByTimeOfDay,
} from "../../lib/utils";
import type { Activity, ItineraryData, TimeOfDay } from "../../types/itinerary";

interface CurrentAndNext {
  current: Activity | null;
  next: Activity | null;
  currentDayNumber: number;
}

const TIME_OF_DAY_ORDER: TimeOfDay[] = ["morning", "afternoon", "evening"];

const SECTION_HOUR_RANGES: Record<TimeOfDay, [number, number]> = {
  morning: [9, 13],
  afternoon: [13, 18],
  evening: [18, 24],
};

function getCurrentAndNextActivity(
  data: ItineraryData,
): CurrentAndNext {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const nowMinutes = currentHour * 60 + currentMinute;

  // Find which time-of-day section "now" falls in
  let currentSection: TimeOfDay = "morning";
  for (const section of TIME_OF_DAY_ORDER) {
    const [start, end] = SECTION_HOUR_RANGES[section];
    if (currentHour >= start && currentHour < end) {
      currentSection = section;
      break;
    }
  }

  // Try to match today's date, otherwise default to day 1
  const todayStr = now.toISOString().split("T")[0];
  let dayData = data.days.find((d) => d.date === todayStr);
  if (!dayData) dayData = data.days[0];
  if (!dayData) return { current: null, next: null, currentDayNumber: 1 };

  const grouped = groupActivitiesByTimeOfDay(dayData.activities);

  // Walk through activities in current section to find which spans "now"
  const sectionActivities = grouped[currentSection] ?? [];
  let precedingMinutes = 0;
  let foundCurrent: Activity | null = null;
  let foundNext: Activity | null = null;

  for (let i = 0; i < sectionActivities.length; i++) {
    const act = sectionActivities[i];
    const { startTime, endTime } = computeDisplayTime(
      currentSection,
      i,
      precedingMinutes,
      act.duration_minutes,
    );
    // Parse start/end to minutes for comparison
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);

    if (nowMinutes >= startMin && nowMinutes < endMin) {
      foundCurrent = act;
      foundNext = sectionActivities[i + 1] ?? null;
      break;
    }
    if (nowMinutes < startMin && !foundCurrent) {
      // We haven't reached this activity yet — it's the next one
      foundNext = act;
      foundCurrent = i > 0 ? sectionActivities[i - 1] : null;
      break;
    }
    precedingMinutes += act.duration_minutes;
  }

  // If nothing matched in section, pick first activity as current
  if (!foundCurrent && !foundNext && sectionActivities.length > 0) {
    foundCurrent = sectionActivities[0];
    foundNext = sectionActivities[1] ?? null;
  }

  // If section was empty, pick from all activities
  if (!foundCurrent && !foundNext && dayData.activities.length > 0) {
    foundCurrent = dayData.activities[0];
    foundNext = dayData.activities[1] ?? null;
  }

  return {
    current: foundCurrent,
    next: foundNext,
    currentDayNumber: dayData.day,
  };
}

function parseTimeToMinutes(time: string): number {
  const match = time.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatLocation(
  location: Activity["location"],
): string {
  if (!location) return "";
  if (typeof location === "string") return location;
  return location.name ?? location.address ?? "";
}

interface MobileItinerarySheetProps {
  itineraryData: ItineraryData;
  onOpenActivity: (activity: Activity) => void;
  onNavigate?: (activity: Activity) => void;
}

export function MobileItinerarySheet({
  itineraryData,
  onOpenActivity,
  onNavigate,
}: MobileItinerarySheetProps) {
  const { current, next, currentDayNumber } = useMemo(
    () => getCurrentAndNextActivity(itineraryData),
    [itineraryData],
  );

  const [activeDay, setActiveDay] = useState(currentDayNumber);

  const dayData = itineraryData.days.find((d) => d.day === activeDay) ??
    itineraryData.days[0];

  const grouped = useMemo(
    () => (dayData ? groupActivitiesByTimeOfDay(dayData.activities) : null),
    [dayData],
  );

  const handleNavigate = () => {
    if (!current) return;
    if (onNavigate) {
      onNavigate(current);
      return;
    }
    // Default: open Google Maps directions
    const loc = current.location;
    let query = current.name;
    if (loc) {
      if (typeof loc === "string") query = loc;
      else if (loc.lat && loc.lng) query = `${loc.lat},${loc.lng}`;
      else if (loc.name) query = loc.name;
    }
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
      "_blank",
    );
  };

  const peekContent = (
    <div className="px-4 pb-3">
      {/* DAY X · NOW + Navigate */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Day {currentDayNumber} · Now
        </span>
        <button
          type="button"
          onClick={handleNavigate}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-600 text-white text-xs font-medium"
        >
          <Navigation className="w-3 h-3" />
          Navigate
        </button>
      </div>

      {/* Current activity */}
      {current && (
        <div className="mb-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {current.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {formatLocation(current.location)}
          </p>
        </div>
      )}

      {/* Separator + next stop */}
      {next && (
        <>
          <div className="border-t border-border my-2" />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Next Stop
            </span>
            <p className="text-sm text-foreground truncate mt-0.5">
              {next.name}
            </p>
          </div>
        </>
      )}
    </div>
  );

  const expandedContent = (
    <div className="pt-3">
      <DayTabs
        days={itineraryData.days}
        activeDay={activeDay}
        onSelectDay={setActiveDay}
      />

      {grouped && (
        <div className="px-4 pt-3">
          {TIME_OF_DAY_ORDER.map((tod) => (
            <TimeOfDaySection
              key={tod}
              timeOfDay={tod}
              activities={grouped[tod]}
              selectedIds={new Set()}
              isSelectionMode={false}
              onToggleSelect={() => {}}
              onOpenActivity={onOpenActivity}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <MobileBottomSheet
      peekContent={peekContent}
      expandedContent={expandedContent}
    />
  );
}
