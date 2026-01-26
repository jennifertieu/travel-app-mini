import {
  ITripContext,
  IMapAnnotation,
  IMapIntelligenceResponse,
  IScheduledActivity,
} from "../types/interface.js";

/**
 * Get icon name based on activity type or name
 */
const getActivityIcon = (activity: IScheduledActivity): string => {
  const titleLower = activity.title.toLowerCase();

  if (
    titleLower.includes("restaurant") ||
    titleLower.includes("food") ||
    titleLower.includes("eat") ||
    titleLower.includes("lunch") ||
    titleLower.includes("dinner") ||
    titleLower.includes("breakfast")
  ) {
    return "restaurant";
  }

  if (
    titleLower.includes("museum") ||
    titleLower.includes("gallery") ||
    titleLower.includes("art")
  ) {
    return "museum";
  }

  if (
    titleLower.includes("park") ||
    titleLower.includes("garden") ||
    titleLower.includes("nature")
  ) {
    return "park";
  }

  if (
    titleLower.includes("tower") ||
    titleLower.includes("monument") ||
    titleLower.includes("landmark")
  ) {
    return "landmark";
  }

  if (
    titleLower.includes("shopping") ||
    titleLower.includes("market") ||
    titleLower.includes("store")
  ) {
    return "shopping";
  }

  if (
    titleLower.includes("travel") ||
    titleLower.includes("train") ||
    titleLower.includes("bus")
  ) {
    return "transport";
  }

  return "place"; // Default icon
};

/**
 * Determine annotation priority based on activity timing
 */
const getAnnotationPriority = (
  activity: IScheduledActivity,
  currentTimeOfDay: "morning" | "afternoon" | "evening"
): number => {
  // Current time slot activities get highest priority
  if (activity.time_of_day === currentTimeOfDay) {
    return 1;
  }

  // Next time slot gets medium priority
  const timeOrder = { morning: 0, afternoon: 1, evening: 2 };
  const current = timeOrder[currentTimeOfDay];
  const activityOrder = timeOrder[activity.time_of_day];

  if (activityOrder === current + 1) {
    return 2;
  }

  return 3;
};

/**
 * Calculate optimal zoom level based on annotations spread
 */
const calculateZoomLevel = (annotations: IMapAnnotation[]): number => {
  if (annotations.length === 0) return 14;
  if (annotations.length === 1) return 15;

  // Calculate bounding box
  const lats = annotations.map((a) => a.location.lat);
  const lngs = annotations.map((a) => a.location.lng);

  const latSpread = Math.max(...lats) - Math.min(...lats);
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);
  const maxSpread = Math.max(latSpread, lngSpread);

  // Rough zoom level calculation
  if (maxSpread > 0.5) return 10; // Very spread out
  if (maxSpread > 0.2) return 11;
  if (maxSpread > 0.1) return 12;
  if (maxSpread > 0.05) return 13;
  if (maxSpread > 0.02) return 14;
  return 15; // Very close together
};

/**
 * Calculate center point of annotations
 */
const calculateCenter = (
  annotations: IMapAnnotation[]
): { lat: number; lng: number } => {
  if (annotations.length === 0) {
    return { lat: 0, lng: 0 };
  }

  const sumLat = annotations.reduce((sum, a) => sum + a.location.lat, 0);
  const sumLng = annotations.reduce((sum, a) => sum + a.location.lng, 0);

  return {
    lat: sumLat / annotations.length,
    lng: sumLng / annotations.length,
  };
};

interface IMapIntelligenceParams {
  context: ITripContext;
  viewport?: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  };
  includeFoodAnnotations?: boolean;
}

/**
 * Generate map annotations for scheduled activities and POIs
 * This is a utility function (NOT an AI agent)
 */
export const getMapIntelligence = async (
  params: IMapIntelligenceParams
): Promise<IMapIntelligenceResponse> => {
  const { context, viewport, includeFoodAnnotations = false } = params;
  const { schedule, temporal, user } = context;

  const annotations: IMapAnnotation[] = [];

  // Add user's current location marker
  annotations.push({
    location: {
      lat: user.location.lat,
      lng: user.location.lng,
    },
    type: "recommended",
    title: "You are here",
    icon: "user_location",
    priority: 1,
    snippet: user.location.is_approximate
      ? "Approximate location"
      : "Current location",
  });

  // Add scheduled activities for today
  for (const activity of schedule.today_activities) {
    if (!activity.location) continue;

    const priority = getAnnotationPriority(activity, temporal.time_of_day);
    const icon = getActivityIcon(activity);

    // Build snippet text
    let snippet = `${activity.time_of_day}`;
    if (activity.duration_minutes) {
      snippet += ` • ${activity.duration_minutes} min`;
    }

    annotations.push({
      location: activity.location,
      type: "scheduled",
      title: activity.title,
      icon: icon,
      priority: priority,
      snippet: snippet,
      activity_id: activity.id,
    });
  }

  // Add next activity marker with special priority if exists
  if (schedule.next_activity?.location) {
    // Find and update the existing annotation for next activity
    const nextActivityAnnotation = annotations.find(
      (a) =>
        a.activity_id === schedule.next_activity?.id && a.type === "scheduled"
    );

    if (nextActivityAnnotation) {
      nextActivityAnnotation.priority = 1;
      nextActivityAnnotation.snippet = `Next up • ${
        schedule.time_until_next
          ? `in ~${Math.round(schedule.time_until_next / 60)}h`
          : schedule.next_activity.time_of_day
      }`;
    }
  }

  // Filter annotations by viewport if provided
  let filteredAnnotations = annotations;
  if (viewport) {
    filteredAnnotations = annotations.filter((annotation) => {
      const { lat, lng } = annotation.location;
      return (
        lat >= viewport.sw.lat &&
        lat <= viewport.ne.lat &&
        lng >= viewport.sw.lng &&
        lng <= viewport.ne.lng
      );
    });
  }

  // Calculate map center and zoom
  const center =
    filteredAnnotations.length > 0
      ? calculateCenter(filteredAnnotations)
      : { lat: user.location.lat, lng: user.location.lng };

  const zoomLevel = calculateZoomLevel(filteredAnnotations);

  return {
    annotations: filteredAnnotations,
    center: center,
    zoom_level: zoomLevel,
  };
};
