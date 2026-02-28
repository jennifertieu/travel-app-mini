import { IItinerary } from "./assignActivityToDay.js";

export interface IMoveActivityArgs {
  activity_id: string;
  to_day_number: number;
  to_time_of_day: "morning" | "afternoon" | "evening";
}

/**
 * Moves an activity from its current day/slot to a different day and time slot.
 * Searches all days to find the activity (unlike assign, which only looks in the pool).
 *
 * @param itinerary - The current itinerary object (mutated in place)
 * @param args - Move details
 * @returns Success/failure result
 */
export const moveActivity = (
  itinerary: IItinerary,
  args: IMoveActivityArgs
) => {
  try {
    const { activity_id, to_day_number, to_time_of_day } = args;

    // Find the activity across all days
    let sourceDay = null;
    let activityIndex = -1;

    for (const day of itinerary.days) {
      const idx = day.activities.findIndex((a) => a.id === activity_id);
      if (idx !== -1) {
        sourceDay = day;
        activityIndex = idx;
        break;
      }
    }

    if (!sourceDay || activityIndex === -1) {
      return {
        success: false,
        error: `Activity ${activity_id} not found in any day`,
      };
    }

    const targetDay = itinerary.days.find(
      (d) => d.day_number === to_day_number
    );
    if (!targetDay) {
      return { success: false, error: "Target day not found in itinerary" };
    }

    // Remove from source day
    const [activity] = sourceDay.activities.splice(activityIndex, 1);

    // Add to target day with new time slot
    targetDay.activities.push({
      ...activity,
      time_of_day: to_time_of_day,
    });

    return {
      success: true,
      message: `Moved activity ${activity_id} from day ${sourceDay.day_number} to day ${to_day_number} (${to_time_of_day})`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Failed to move activity",
      details: error.message,
    };
  }
};
