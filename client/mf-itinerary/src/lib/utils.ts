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
