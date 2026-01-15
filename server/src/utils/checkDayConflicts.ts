import {
  travelTimeBetweenActivities,
  IActivityLocation,
} from "./travelTimeBetweenActivities.js";
import { IItineraryDay } from "./assignActivityToDay.js";
import { getDurationMinutes } from "./getDurationMinutes.js";

export interface IConflict {
  type: "overlap" | "duration_exceeded" | "travel_time_issue";
  activities: any[];
  time_of_day: "morning" | "afternoon" | "evening";
  description: string;
}

export interface ICheckDayConflictsResult {
  hasConflicts: boolean;
  conflicts: IConflict[];
}

export const checkDayConflicts = async (day: IItineraryDay) => {
  const conflicts: IConflict[] = [];
  const timeSlots: Array<"morning" | "afternoon" | "evening"> = [
    "morning",
    "afternoon",
    "evening",
  ];
  const SLOT_LIMIT_MINUTES = 300; // 5 hours

  for (const slot of timeSlots) {
    const activitiesInSlot = day.activities.filter(
      (a) => a.time_of_day === slot
    );

    // Check total duration for the slot
    const totalSlotDuration = activitiesInSlot.reduce(
      (sum, activity) => sum + getDurationMinutes(activity),
      0
    );
    if (totalSlotDuration > SLOT_LIMIT_MINUTES) {
      conflicts.push({
        type: "duration_exceeded",
        activities: activitiesInSlot,
        time_of_day: slot,
        description: `Total duration in ${slot} exceeds ${SLOT_LIMIT_MINUTES} minutes`,
      });
    }

    // Check travel time between consecutive activities
    for (let i = 0; i < activitiesInSlot.length - 1; i++) {
      const current = activitiesInSlot[i];
      const next = activitiesInSlot[i + 1];

      let travelMinutes = 0;
      if (
        current.latitude != null &&
        current.longitude != null &&
        next.latitude != null &&
        next.longitude != null
      ) {
        const travelResult = await travelTimeBetweenActivities(
          {
            latitude: current.latitude,
            longitude: current.longitude,
          },
          {
            latitude: next.latitude,
            longitude: next.longitude,
          },
          current.travel_mode || "driving"
        );
        travelMinutes =
          typeof travelResult.minutes === "number" ? travelResult.minutes : 0;
      }

      const currentEnd = getDurationMinutes(current) + travelMinutes;
      if (currentEnd > SLOT_LIMIT_MINUTES) {
        conflicts.push({
          type: "travel_time_issue",
          activities: [current, next],
          time_of_day: slot,
          description: `Travel time (${travelMinutes} min) + activity duration (${getDurationMinutes(
            current
          )} min) exceeds slot limit before next activity`,
        });
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
};
