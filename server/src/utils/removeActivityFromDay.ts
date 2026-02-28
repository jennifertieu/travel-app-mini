import { IItinerary } from "./assignActivityToDay.js";

export interface IRemoveActivityArgs {
  activity_id: string;
  day_number: number;
  return_to_pool: boolean;
}

/**
 * Removes an activity from a specific day in the itinerary.
 * Optionally returns it to the activities pool for reassignment.
 *
 * @param itinerary - The current itinerary object (mutated in place)
 * @param args - Removal details
 * @returns Success/failure result
 */
export const removeActivityFromDay = (
  itinerary: IItinerary,
  args: IRemoveActivityArgs
) => {
  try {
    const { activity_id, day_number, return_to_pool } = args;

    const day = itinerary.days.find((d) => d.day_number === day_number);
    if (!day) {
      return { success: false, error: "Day not found in itinerary" };
    }

    const activityIndex = day.activities.findIndex(
      (a) => a.id === activity_id
    );
    if (activityIndex === -1) {
      return {
        success: false,
        error: `Activity ${activity_id} not found on day ${day_number}`,
      };
    }

    const [activity] = day.activities.splice(activityIndex, 1);

    if (return_to_pool) {
      const { time_of_day, ...cleanActivity } = activity;
      itinerary.activities_pool.push(cleanActivity);
    }

    return {
      success: true,
      message: `Removed activity ${activity_id} from day ${day_number}${return_to_pool ? " (returned to pool)" : " (discarded)"}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Failed to remove activity",
      details: error.message,
    };
  }
};
