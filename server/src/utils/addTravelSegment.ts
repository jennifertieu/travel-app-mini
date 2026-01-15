import { IItinerary, IItineraryDay } from "./assignActivityToDay.js";
import { TravelMode } from "./travelTimeBetweenActivities.js";

export interface IAddTravelSegmentArgs {
  destination_name: string;
  destination_location: string;
  travel_mode: TravelMode;
  duration_minutes: number;
  day_number: number;
  time_slots: ("morning" | "afternoon" | "evening")[];
}

export interface ITravelSegment {
  id: string;
  type: "travel";
  name: string;
  location: string;
  destination_name: string;
  destination_location: string;
  travel_mode: TravelMode;
  duration_minutes: number;
  time_of_day: string; // Combined slots like "morning-afternoon" or single slot
}

/**
 * Adds a travel segment to the itinerary.
 * Travel segments represent the time spent traveling between different cities/regions.
 * They can span multiple time slots for long journeys.
 *
 * @param itinerary - The current itinerary object
 * @param args - Travel segment details
 * @returns Success/failure result with the created segment
 */
export const addTravelSegment = (
  itinerary: IItinerary,
  args: IAddTravelSegmentArgs
) => {
  try {
    const {
      destination_name,
      destination_location,
      travel_mode,
      duration_minutes,
      day_number,
      time_slots,
    } = args;

    // Find the day
    const day = itinerary.days.find((d) => d.day_number === day_number);
    if (!day) {
      return { success: false, error: "Day not found in itinerary" };
    }

    // Validate time slots
    if (!time_slots || time_slots.length === 0) {
      return { success: false, error: "At least one time slot is required" };
    }

    // Generate unique ID for travel segment
    const travelId = `travel-${day_number}-${Date.now()}`;

    // Format time_of_day based on slots used
    const timeOfDay =
      time_slots.length === 1 ? time_slots[0] : time_slots.join("-");

    // Format travel mode for display
    const modeDisplay =
      travel_mode === "transit"
        ? "train/transit"
        : travel_mode === "driving"
          ? "car"
          : "walking";

    // Format duration for display
    const hours = Math.floor(duration_minutes / 60);
    const mins = duration_minutes % 60;
    const durationDisplay =
      hours > 0
        ? mins > 0
          ? `${hours}h ${mins}m`
          : `${hours}h`
        : `${mins}m`;

    const travelSegment: ITravelSegment = {
      id: travelId,
      type: "travel",
      name: `Travel to ${destination_name}`,
      location: destination_location,
      destination_name,
      destination_location,
      travel_mode,
      duration_minutes,
      time_of_day: timeOfDay,
    };

    // Add to day's activities
    day.activities.push({
      ...travelSegment,
      description: `${durationDisplay} by ${modeDisplay}`,
    });

    return {
      success: true,
      message: `Added travel segment to ${destination_name} on day ${day_number} (${timeOfDay})`,
      segment: travelSegment,
    };
  } catch (error: any) {
    return {
      success: false,
      error: "Failed to add travel segment",
      details: error.message,
    };
  }
};
