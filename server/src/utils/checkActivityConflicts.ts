import { IItineraryDay } from "./assignActivityToDay.js";
import { IActivity } from "../types/interface.js";
import { getDurationMinutes } from "./getDurationMinutes.js";
import { travelTimeBetweenActivities } from "./travelTimeBetweenActivities.js";

export interface IActivityConflict {
  type: "duration_exceeded" | "travel_time_issue";
  time_of_day: "morning" | "afternoon" | "evening";
  description: string;
  conflicting_activities: Array<{
    id: string;
    name: string;
  }>;
}

export interface ICheckActivityConflictsResult {
  hasConflicts: boolean;
  conflicts: IActivityConflict[];
}

const SLOT_LIMIT_MINUTES = 300; // 5 hours

/**
 * Check if adding a new activity to a day would cause scheduling conflicts
 * 
 * Validates two types of conflicts:
 * 1. Duration exceeded: Total activities in time slot exceed 5-hour limit
 * 2. Travel time issue: Travel time + activity durations exceed slot limit
 * 
 * This function is used when accepting suggestions to prevent over-scheduling.
 * It checks the specified time_of_day slot and calculates total duration including
 * travel time from the last activity in that slot.
 * 
 * @param day - The itinerary day object containing existing activities
 * @param newActivity - The new activity to be added (must have time_of_day and duration_minutes)
 * 
 * @returns Promise resolving to conflict check result
 * @returns hasConflicts - Boolean indicating if conflicts were detected
 * @returns conflicts - Array of conflict objects with type, description, and conflicting activities
 * 
 * @example
 * ```typescript
 * const result = await checkActivityConflicts(today, newActivity);
 * if (result.hasConflicts && !override_conflicts) {
 *   return response.status(409).json({ conflicts: result.conflicts });
 * }
 * ```
 */
export const checkActivityConflicts = async (
  day: IItineraryDay,
  newActivity: IActivity
): Promise<ICheckActivityConflictsResult> => {
  const conflicts: IActivityConflict[] = [];
  const { time_of_day, duration_minutes } = newActivity;

  // Validate required fields
  if (!time_of_day) {
    return {
      hasConflicts: false,
      conflicts: [],
    };
  }

  // Get existing activities in the same time slot
  const activitiesInSlot = day.activities.filter(
    (a) => a.time_of_day === time_of_day
  );

  // Calculate total duration if we add the new activity
  const existingDuration = activitiesInSlot.reduce(
    (sum, activity) => sum + (getDurationMinutes(activity) || activity.duration_minutes || 0),
    0
  );
  const totalDuration = existingDuration + (duration_minutes || 0);

  // Check if total duration exceeds slot limit
  if (totalDuration > SLOT_LIMIT_MINUTES) {
    conflicts.push({
      type: "duration_exceeded",
      time_of_day,
      description: `Adding this activity would exceed the ${SLOT_LIMIT_MINUTES}-minute limit for ${time_of_day} slot`,
      conflicting_activities: activitiesInSlot.map((a) => ({
        id: a.id,
        name: a.name || a.title || "Unknown Activity",
      })),
    });
  }

  // Check travel time issues if we're inserting the activity
  // We need to check travel time from previous activity to new one, and from new one to next
  if (activitiesInSlot.length > 0 && newActivity.location) {
    // Check travel time from last activity in slot to new activity
    const lastActivity = activitiesInSlot[activitiesInSlot.length - 1];
    
    // Get coordinates from last activity (handle both formats)
    const lastLat = lastActivity.latitude || lastActivity.location?.lat;
    const lastLng = lastActivity.longitude || lastActivity.location?.lng;
    
    if (lastLat && lastLng) {
      const travelResult = await travelTimeBetweenActivities(
        {
          latitude: lastLat,
          longitude: lastLng,
        },
        {
          latitude: newActivity.location.lat,
          longitude: newActivity.location.lng,
        },
        lastActivity.travel_mode || "walking"
      );

      const travelMinutes =
        typeof travelResult.minutes === "number" ? travelResult.minutes : 0;
      const lastActivityDuration =
        getDurationMinutes(lastActivity) || lastActivity.duration_minutes || 0;
      const totalTime = lastActivityDuration + travelMinutes + (duration_minutes || 0);

      if (totalTime > SLOT_LIMIT_MINUTES) {
        conflicts.push({
          type: "travel_time_issue",
          time_of_day,
          description: `Travel time (${travelMinutes} min) + activity durations would exceed slot limit`,
          conflicting_activities: [
            {
              id: lastActivity.id,
              name: lastActivity.name || lastActivity.title || "Unknown Activity",
            },
          ],
        });
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
};
