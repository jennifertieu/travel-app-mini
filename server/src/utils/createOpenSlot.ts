import { IItineraryDay } from "../types/interface.js";

export interface IOpenSlot {
  id: string;
  type: "open_slot";
  title: string;
  time_of_day: "morning" | "afternoon" | "evening";
  duration_minutes: number;
}

/**
 * Creates an open time slot for free time or unplanned activities.
 * This adds an "Open Slot" activity to the day's activities array.
 */
export const createOpenSlot = (
  day: IItineraryDay,
  time_of_day: "morning" | "afternoon" | "evening",
  duration_minutes: number
): IOpenSlot => {
  const openSlot: IOpenSlot = {
    id: `open-slot-${day.day_number}-${time_of_day}-${Date.now()}`,
    type: "open_slot",
    title: "Free Time",
    time_of_day,
    duration_minutes,
  };

  // Add the open slot to the day's activities
  day.activities.push({
    ...openSlot,
    description: `${Math.floor(duration_minutes / 60)}h of free time for relaxation or spontaneous exploration`,
  } as any);

  return openSlot;
};
