import {
  travelTimeBetweenActivities,
  TravelMode,
  IActivityLocation,
} from "./travelTimeBetweenActivities.js";

export interface TravelModeResult {
  mode: TravelMode;
  minutes: number;
}

export interface FindBestTravelModeResult {
  bestMode: TravelModeResult | null;
  allModes: TravelModeResult[];
  requiresMultipleSlots: boolean;
  estimatedSlots: number;
}

const TRAVEL_MODE_PRIORITY: TravelMode[] = ["walking", "transit", "driving"];
const SLOT_DURATION_MINUTES = 180; // ~3 hours per time slot

/**
 * Tests all travel modes between two locations and returns the best viable option.
 * Prioritizes walking first, then transit, then driving.
 *
 * @param from - Starting location coordinates
 * @param to - Destination location coordinates
 * @param availableMinutes - Optional max time available (if not provided, returns all options)
 * @returns Best travel mode and all tested modes with their times
 */
export const findBestTravelMode = async (
  from: IActivityLocation,
  to: IActivityLocation,
  availableMinutes?: number
): Promise<FindBestTravelModeResult> => {
  const allModes: TravelModeResult[] = [];

  // Test all travel modes in parallel
  const results = await Promise.all(
    TRAVEL_MODE_PRIORITY.map(async (mode) => {
      const result = await travelTimeBetweenActivities(from, to, mode);
      if ("minutes" in result && typeof result.minutes === "number") {
        return { mode, minutes: result.minutes };
      }
      return null;
    })
  );

  // Filter out failed requests
  for (const result of results) {
    if (result) {
      allModes.push(result);
    }
  }

  // Sort by priority (walking first, then transit, then driving)
  allModes.sort(
    (a, b) =>
      TRAVEL_MODE_PRIORITY.indexOf(a.mode) -
      TRAVEL_MODE_PRIORITY.indexOf(b.mode)
  );

  // Find best mode based on available time or just pick the fastest walking-priority option
  let bestMode: TravelModeResult | null = null;

  if (availableMinutes !== undefined) {
    // Find the first mode that fits within available time (respecting priority)
    for (const mode of allModes) {
      if (mode.minutes <= availableMinutes) {
        bestMode = mode;
        break;
      }
    }
    // If nothing fits, return the fastest option
    if (!bestMode && allModes.length > 0) {
      bestMode = allModes.reduce((fastest, current) =>
        current.minutes < fastest.minutes ? current : fastest
      );
    }
  } else {
    // No time constraint - return walking if reasonable (<30 min), otherwise fastest
    const walkingOption = allModes.find((m) => m.mode === "walking");
    if (walkingOption && walkingOption.minutes <= 30) {
      bestMode = walkingOption;
    } else if (allModes.length > 0) {
      // Return fastest option
      bestMode = allModes.reduce((fastest, current) =>
        current.minutes < fastest.minutes ? current : fastest
      );
    }
  }

  // Calculate how many time slots this travel would require
  const travelMinutes = bestMode?.minutes || 0;
  const estimatedSlots = Math.ceil(travelMinutes / SLOT_DURATION_MINUTES);
  const requiresMultipleSlots = estimatedSlots > 1;

  return {
    bestMode,
    allModes,
    requiresMultipleSlots,
    estimatedSlots,
  };
};
