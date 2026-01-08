export interface IAssignActivityArgs {
  activity_id: string;
  day_number: number;
  time_of_day: "morning" | "afternoon" | "evening";
}

export interface IItineraryDay {
  date: string;
  day_number: number;
  activities: any[];
}

export interface IItinerary {
  trip_id: string;
  trip_title: string;
  destination: string;
  start_date: string;
  end_date: string;
  days: IItineraryDay[];
  activities_pool: any[];
}

export const assignActivityToDay = (
  itinerary: IItinerary,
  args: IAssignActivityArgs
) => {
  try {
    const { activity_id, day_number, time_of_day } = args;

    // Find activity in pool
    const activityIndex = itinerary.activities_pool.findIndex(
      (a) => a.id === activity_id
    );
    if (activityIndex === -1) {
      return { success: false, error: "Activity not found in pool" };
    }

    // Find the day
    const day = itinerary.days.find((d) => d.day_number === day_number);
    if (!day) {
      return { success: false, error: "Day not found in itinerary" };
    }

    // Remove from pool and add to day
    const [activity] = itinerary.activities_pool.splice(activityIndex, 1);
    day.activities.push({
      ...activity,
      time_of_day,
    });

    return {
      success: true,
      message: `Assigned activity ${activity_id} to day ${day_number} (${time_of_day})`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Failed to assign activity",
      details: error.message,
    };
  }
};
