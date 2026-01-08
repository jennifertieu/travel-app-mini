import { IItineraryDay, IActivity } from "../types/interface";

export interface IOpenSlot {
  time_of_day: "morning" | "afternoon" | "evening";
  available_minutes: number;
  activities: IActivity[];
}

export const createOpenSlot = (
  day: IItineraryDay,
  time_of_day: "morning" | "afternoon" | "evening",
  available_minutes: number
): IOpenSlot => {
  const activities = day.activities.filter(
    (activity: IActivity) => activity.time_of_day === time_of_day
  );

  return {
    time_of_day,
    available_minutes,
    activities,
  };
};
