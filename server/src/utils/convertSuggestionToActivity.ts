import { IAcceptSuggestionRequest, IActivity } from "../types/interface.js";

/**
 * Converts a suggestion (from decision agent or food recommendations) to an itinerary activity
 */
export const convertSuggestionToActivity = (
  request: IAcceptSuggestionRequest
): IActivity => {
  const { suggestion, time_of_day, duration_minutes } = request;

  // Generate activity ID
  // For scheduled activities, use the existing ID if it's a UUID
  // For new suggestions, generate a timestamp-based ID
  let activityId: string;
  if (suggestion.id.startsWith("place_") || suggestion.id.includes("-")) {
    // Likely a UUID or place_id-based ID, use as-is
    activityId = suggestion.id;
  } else {
    // Generate new ID
    activityId = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Build activity object
  const activity: IActivity = {
    id: activityId,
    name: suggestion.title,
    time_of_day,
    duration_minutes,
    location: {
      lat: suggestion.coordinates.lat,
      lng: suggestion.coordinates.lng,
    },
    // Also add latitude/longitude for compatibility with existing code
    latitude: suggestion.coordinates.lat,
    longitude: suggestion.coordinates.lng,
  };

  // Add optional fields if present
  if (suggestion.reason) {
    activity.description = suggestion.reason;
  }

  // Add tags based on type
  const tags: string[] = [];
  if (suggestion.type === "restaurant" || suggestion.type === "cafe" || suggestion.type === "quick_bite" || suggestion.type === "park_rest") {
    tags.push("food");
    if (suggestion.cuisine) {
      tags.push(suggestion.cuisine.toLowerCase());
    }
  } else if (suggestion.type === "spontaneous") {
    tags.push("spontaneous");
  } else if (suggestion.type === "rest") {
    tags.push("rest");
  } else if (suggestion.type === "scheduled") {
    tags.push("scheduled");
  }

  if (tags.length > 0) {
    activity.tags = tags;
  }

  return activity;
};
