import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import type { TimeOfDay, Activity } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SECTION_START_HOURS: Record<TimeOfDay, number> = {
  morning: 9,
  afternoon: 13,
  evening: 18,
};

export function computeDisplayTime(
  timeOfDay: TimeOfDay,
  indexInSection: number,
  precedingMinutes: number,
  durationMinutes: number,
): { startTime: string; endTime: string } {
  const baseHour = SECTION_START_HOURS[timeOfDay];
  const startTotalMinutes = baseHour * 60 + (precedingMinutes || 0);
  const endTotalMinutes = startTotalMinutes + (durationMinutes || 60);

  return {
    startTime: formatMinutesToTime(startTotalMinutes),
    endTime: formatMinutesToTime(endTotalMinutes),
  };
}

function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function formatDayDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "EEE, MMM d");
  } catch {
    return dateStr;
  }
}

/**
 * Convert a duration_bucket string (e.g. "1-2h", "30min", "2h") into minutes.
 * Falls back to 60 if the format is unrecognised.
 */
export function parseDurationBucket(bucket: string | undefined | null): number {
  if (!bucket) return 60;
  const rangeMatch = bucket.match(
    /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*h/i,
  );
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    return Math.round(((low + high) / 2) * 60);
  }
  const hourMatch = bucket.match(/^(\d+(?:\.\d+)?)\s*h/i);
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60);
  const minMatch = bucket.match(/^(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1], 10);
  return 60;
}

export function formatDuration(minutes: number): string {
  const mins = minutes || 60;
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
export function groupActivitiesByTimeOfDay(
  activities: Activity[],
): Record<TimeOfDay, Activity[]> {
  const groups: Record<TimeOfDay, Activity[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  for (const activity of activities) {
    const key = activity.time_of_day || "morning";
    if (groups[key]) {
      groups[key].push(activity);
    }
  }
  return groups;
}
