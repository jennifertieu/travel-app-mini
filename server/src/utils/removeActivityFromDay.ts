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
    const { activity_id, return_to_pool } = args;

    // Search all days for the activity (day_number hint is unreliable after swaps/moves)
    let day = null;
    let activityIndex = -1;
    for (const d of itinerary.days) {
      const idx = d.activities.findIndex((a) => a.id === activity_id);
      if (idx !== -1) {
        day = d;
        activityIndex = idx;
        break;
      }
    }

    if (!day || activityIndex === -1) {
      return {
        success: false,
        error: `Activity ${activity_id} not found in any day`,
      };
    }

    const [activity] = day.activities.splice(activityIndex, 1);

    if (return_to_pool) {
      const { time_of_day, ...cleanActivity } = activity;
      itinerary.activities_pool.push(cleanActivity);
    }

    return {
      success: true,
      message: `Removed activity ${activity_id} from day ${day.day_number}${return_to_pool ? " (returned to pool)" : " (discarded)"}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Failed to remove activity",
      details: error.message,
    };
  }
};
