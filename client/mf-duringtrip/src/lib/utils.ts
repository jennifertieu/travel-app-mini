import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns";
import type { TimeOfDay, Activity, ItineraryDay, ItineraryData } from "../types/itinerary";

export type ActivityStatus = "past" | "current" | "upcoming";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  try {
    if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  } catch (e) {
    // Fall through to fallback
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Itinerary utility functions

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
  const startTotalMinutes = baseHour * 60 + precedingMinutes;
  const endTotalMinutes = startTotalMinutes + durationMinutes;

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

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
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

// --- Activity status utilities ---

export function parseTimeToMinutes(time: string): number {
  const match = time.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Returns the day number that matches today's date, or undefined if no match.
 */
export function getCurrentDayNumber(days: ItineraryDay[], now?: Date): number | undefined {
  const todayStr = (now ?? new Date()).toISOString().split("T")[0];
  const match = days.find((d) => d.date === todayStr);
  return match?.day;
}

/**
 * Determines whether an activity is past, current, or upcoming based on
 * day date and computed display time.
 */
export function getActivityStatus(
  timeOfDay: TimeOfDay,
  indexInSection: number,
  precedingMinutes: number,
  durationMinutes: number,
  dayDate: string,
  now?: Date,
): ActivityStatus {
  const effectiveNow = now ?? new Date();
  const todayStr = effectiveNow.toISOString().split("T")[0];

  if (dayDate < todayStr) return "past";
  if (dayDate > todayStr) return "upcoming";

  // Today — compare computed times to current time
  const nowMinutes = effectiveNow.getHours() * 60 + effectiveNow.getMinutes();

  const { startTime, endTime } = computeDisplayTime(
    timeOfDay,
    indexInSection,
    precedingMinutes,
    durationMinutes,
  );
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  if (nowMinutes >= endMin) return "past";
  if (nowMinutes >= startMin && nowMinutes < endMin) return "current";
  return "upcoming";
}

export type ActivityWithStatus = Activity & { status: ActivityStatus };

/**
 * Computes status for every activity across all days, returning a flat list.
 */
export function getAllActivitiesWithStatus(
  data: ItineraryData,
  now?: Date,
): ActivityWithStatus[] {
  const result: ActivityWithStatus[] = [];

  for (const day of data.days) {
    const grouped = groupActivitiesByTimeOfDay(day.activities);
    const order: TimeOfDay[] = ["morning", "afternoon", "evening"];

    for (const tod of order) {
      let precedingMinutes = 0;
      for (let idx = 0; idx < grouped[tod].length; idx++) {
        const activity = grouped[tod][idx];
        const status = getActivityStatus(
          tod,
          idx,
          precedingMinutes,
          activity.duration_minutes,
          day.date,
          now,
        );
        result.push({ ...activity, status });
        precedingMinutes += activity.duration_minutes;
      }
    }
  }

  return result;
}
