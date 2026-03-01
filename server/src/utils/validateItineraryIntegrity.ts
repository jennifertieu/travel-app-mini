import { IItinerary } from "./assignActivityToDay.js";

export interface IIntegrityResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the structural integrity of an itinerary after tool modifications.
 * Catches issues like duplicate activity IDs, invalid day numbers, or corrupted data.
 *
 * @param itinerary - The itinerary to validate
 * @returns Whether the itinerary is valid and any errors found
 */
export const validateItineraryIntegrity = (
  itinerary: IItinerary
): IIntegrityResult => {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const validTimeSlots = new Set(["morning", "afternoon", "evening"]);
  const totalDays = itinerary.days.length;

  for (const day of itinerary.days) {
    if (day.day_number < 1 || day.day_number > totalDays) {
      errors.push(
        `Invalid day_number ${day.day_number} (expected 1-${totalDays})`
      );
    }

    for (const activity of day.activities) {
      if (!activity.id) {
        errors.push(
          `Activity without ID found on day ${day.day_number}`
        );
        continue;
      }

      if (seenIds.has(activity.id)) {
        errors.push(
          `Duplicate activity ID "${activity.id}" found on day ${day.day_number}`
        );
      }
      seenIds.add(activity.id);

      // Validate time_of_day (allow multi-slot like "morning-afternoon")
      if (activity.time_of_day) {
        const slots = activity.time_of_day.split("-");
        for (const slot of slots) {
          if (!validTimeSlots.has(slot)) {
            errors.push(
              `Invalid time_of_day "${activity.time_of_day}" for activity "${activity.id}" on day ${day.day_number}`
            );
            break;
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
};
