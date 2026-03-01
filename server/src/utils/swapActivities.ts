import { IItinerary } from "./assignActivityToDay.js";

export interface ISwapActivitiesArgs {
  activity_id_a: string;
  activity_id_b: string;
}

/**
 * Swaps two activities' positions in the itinerary.
 * Each activity takes the other's day and time slot assignment.
 *
 * @param itinerary - The current itinerary object (mutated in place)
 * @param args - The two activity IDs to swap
 * @returns Success/failure result
 */
export const swapActivities = (
  itinerary: IItinerary,
  args: ISwapActivitiesArgs
) => {
  try {
    const { activity_id_a, activity_id_b } = args;

    // Find both activities across all days
    let activityA: any = null;
    let activityB: any = null;
    let dayA: number | null = null;
    let dayB: number | null = null;

    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        if (activity.id === activity_id_a) {
          activityA = activity;
          dayA = day.day_number;
        }
        if (activity.id === activity_id_b) {
          activityB = activity;
          dayB = day.day_number;
        }
      }
    }

    if (!activityA || dayA === null) {
      return {
        success: false,
        error: `Activity ${activity_id_a} not found in any day`,
      };
    }
    if (!activityB || dayB === null) {
      return {
        success: false,
        error: `Activity ${activity_id_b} not found in any day`,
      };
    }

    // Swap their time_of_day assignments
    const tempTimeOfDay = activityA.time_of_day;
    activityA.time_of_day = activityB.time_of_day;
    activityB.time_of_day = tempTimeOfDay;

    // If they're on different days, swap their day positions
    if (dayA !== dayB) {
      const sourceDayObj = itinerary.days.find(
        (d) => d.day_number === dayA
      )!;
      const targetDayObj = itinerary.days.find(
        (d) => d.day_number === dayB
      )!;

      // Remove from original days
      sourceDayObj.activities = sourceDayObj.activities.filter(
        (a) => a.id !== activity_id_a
      );
      targetDayObj.activities = targetDayObj.activities.filter(
        (a) => a.id !== activity_id_b
      );

      // Add to swapped days
      targetDayObj.activities.push(activityA);
      sourceDayObj.activities.push(activityB);
    }

    return {
      success: true,
      message: `Swapped activities: ${activity_id_a} (now day ${dayB}) ↔ ${activity_id_b} (now day ${dayA})`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Failed to swap activities",
      details: error.message,
    };
  }
};
