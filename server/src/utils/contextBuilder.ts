import {
  ITripContext,
  IScheduledActivity,
  ILocationRequest,
  IUserLocation,
  IBuildContextParams,
  IBuildContextResult,
} from "../types/interface.js";
import { IItinerary } from "./assignActivityToDay.js";
import { SupabaseClient } from "@supabase/supabase-js";
import { getWeather } from "./weatherService.js";
import { DURING_TRIP_CACHE_TTL } from "../config.js";
import { clearCachesForTrip } from "./foodRecommendations.js";

// Cache for context data (5-minute TTL by default)
const contextCache = new Map<
  string,
  { data: ITripContext; timestamp: number }
>();

// Milliseconds in one day (1000ms * 60s * 60m * 24h)
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
// Milliseconds in one minute (1000ms * 60s)
const MILLISECONDS_PER_MINUTE = 1000 * 60;

/**
 * Build user location from request, with fallback to trip destination
 */
export const buildUserLocation = (
  requestLocation: ILocationRequest | undefined,
  tripDestination: { lat: number; lng: number }
): IUserLocation => {
  // If no location provided or accuracy is poor (>500m), use trip destination
  if (!requestLocation || (requestLocation.accuracy_meters !== undefined && requestLocation.accuracy_meters > 500)) {
    return {
      lat: tripDestination.lat,
      lng: tripDestination.lng,
      is_approximate: true,
    };
  }

  return {
    lat: requestLocation.lat,
    lng: requestLocation.lng,
    accuracy_meters: requestLocation.accuracy_meters,
    is_approximate: false,
  };
};

/**
 * Calculate time of day based on hour
 */
export const getTimeOfDay = (
  hour: number
): "morning" | "afternoon" | "evening" => {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
};

/**
 * Calculate day number within trip
 */
export const calculateDayNumber = (
  tripStartDate: string,
  currentDate: Date
): number => {
  const startDate = new Date(tripStartDate);
  // normalize times to midnight to properly calculate day differences
  startDate.setHours(0, 0, 0, 0);

  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);

  const diffTime = current.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / MILLISECONDS_PER_DAY);

  return Math.max(1, diffDays + 1); // 1-indexed
};

/**
 * Calculate total days in trip
 */
export const calculateTotalDays = (
  startDate: string,
  endDate: string
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / MILLISECONDS_PER_DAY) + 1;
};

/**
 * Parse itinerary JSONB to get today's scheduled activities
 * Uses Partial<IItinerary> because database JSONB may have incomplete structure
 */
export const getTodayActivities = (
  itinerary: Partial<IItinerary> | null | undefined,
  dayNumber: number
): IScheduledActivity[] => {
  if (!itinerary?.days || !Array.isArray(itinerary.days)) {
    return [];
  }

  const today = itinerary.days.find(
    (day) => day.day_number === dayNumber
  );

  if (!today?.activities || !Array.isArray(today.activities)) {
    return [];
  }

  return today.activities
    .filter((activity) => activity.name !== "Free Time")
    .map((activity) => ({
      id: activity.id,
      title: activity.name || activity.title,
      scheduled_time: activity.scheduled_time || today.date,
      time_of_day: activity.time_of_day || "morning",
      location: activity.location
        ? {
            lat: activity.location.lat || activity.location.latitude,
            lng: activity.location.lng || activity.location.longitude,
          }
        : undefined,
      duration_minutes:
        activity.duration_minutes ||
        (typeof activity.duration === "number" ? activity.duration : 60),
    }));
};

/**
 * Find next upcoming activity based on current time
 * Returns the next activity and actual time until it in minutes, or null if no next activity
 */
export const findNextActivity = (
  activities: IScheduledActivity[],
  currentTime: Date
): { next: IScheduledActivity; timeUntilNext: number } | null => {
  if (activities.length === 0) {
    return null;
  }

  // Parse scheduled times and filter to future activities
  const upcomingActivities = activities
    .map((activity) => {
      const scheduledTime = new Date(activity.scheduled_time);
      return {
        activity,
        scheduledTime,
        timeUntil: scheduledTime.getTime() - currentTime.getTime(),
      };
    })
    .filter((item) => item.timeUntil > 0) // Only future activities
    .sort((a, b) => a.timeUntil - b.timeUntil); // Sort by time until (earliest first)

  if (upcomingActivities.length === 0) {
    return null;
  }

  const next = upcomingActivities[0];
  const timeUntilNextMinutes = Math.round(next.timeUntil / MILLISECONDS_PER_MINUTE);

  return {
    next: next.activity,
    timeUntilNext: timeUntilNextMinutes,
  };
};

/**
 * Build complete trip context for during-trip agents
 * 
 * This is the main entry point for building context. It aggregates data from multiple sources:
 * - Trip metadata (destination, dates, timezone)
 * - User preferences (dietary, travel style, interests)
 * - Current location (with fallback to trip destination)
 * - Weather conditions (via OpenWeatherMap API)
 * - Today's scheduled activities from itinerary
 * - Temporal context (current time, time of day in trip timezone)
 * 
 * The result is cached for 5 minutes (configurable via DURING_TRIP_CACHE_TTL) to reduce
 * API calls and database queries. Location updates bypass cache expiration.
 * 
 * @param params - Context building parameters
 * @param params.tripId - UUID of the trip
 * @param params.userId - UUID of the authenticated user
 * @param params.location - Optional user location from client (lat/lng/accuracy)
 * @param params.supabase - Supabase client instance
 * 
 * @returns Promise resolving to context object or error
 * @returns context - Complete trip context object (ITripContext) or null if trip not found
 * @returns error - Error message string if context building failed
 * 
 * @example
 * ```typescript
 * const { context, error } = await buildTripContext({
 *   tripId: "uuid",
 *   userId: "uuid",
 *   location: { lat: 48.8566, lng: 2.3522, accuracy_meters: 10 },
 *   supabase
 * });
 * ```
 */
export const buildTripContext = async (
  params: IBuildContextParams
): Promise<IBuildContextResult> => {
  const { tripId, userId, location, supabase } = params;

  // Check cache first
  const cacheKey = `${tripId}:${userId}`;
  const cached = contextCache.get(cacheKey);
  const cacheTTL = DURING_TRIP_CACHE_TTL * 1000; // Convert to milliseconds

  // Check if cached context is still valid
  if (cached && Date.now() - cached.timestamp < cacheTTL) {
    // Return deep copy to avoid mutating cached data
    const contextCopy: ITripContext = JSON.parse(JSON.stringify(cached.data));
    
    // Update location if provided (location changes frequently)
    if (location) {
      contextCopy.user.location = buildUserLocation(location, {
        lat: contextCopy.trip.destination_lat,
        lng: contextCopy.trip.destination_lng,
      });
    }
    return { context: contextCopy };
  }

  try {
    // Fetch trip data
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select(
        "id, destination, destination_lat, destination_lng, start_date, end_date, timezone"
      )
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return { context: null, error: "Trip not found" };
    }

    // Fetch user profile/preferences
    const { data: profile } = await supabase
      .from("member_profiles")
      .select("dietary, travel_style, interests, walking_tolerance")
      .eq("id", userId)
      .single();

    // Fetch itinerary for scheduled activities
    const { data: itineraryData } = await supabase
      .from("trip_itineraries")
      .select("itinerary")
      .eq("trip_id", tripId)
      .single();

    // Build current time context
    const now = new Date();
    const timezone = trip.timezone || "UTC";
    
    // Get current hour in trip timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const currentHour = parseInt(formatter.format(now), 10);

    const timeOfDay = getTimeOfDay(currentHour);
    const currentDayNumber = calculateDayNumber(trip.start_date, now);
    const totalDays = calculateTotalDays(trip.start_date, trip.end_date);

    // Check if trip has ended - if so, clear food recommendation caches
    if (trip.end_date) {
      const tripEndDate = new Date(trip.end_date);
      // Add 1 day buffer to account for timezone differences and end-of-day
      tripEndDate.setDate(tripEndDate.getDate() + 1);
      
      if (now > tripEndDate) {
        clearCachesForTrip(trip.id);
      }
    }

    // Get today's activities from itinerary
    const todayActivities = getTodayActivities(
      itineraryData?.itinerary,
      currentDayNumber
    );
    const nextActivityResult = findNextActivity(todayActivities, now);

    // Build user location with fallback
    const tripDestination = {
      lat: trip.destination_lat || 0,
      lng: trip.destination_lng || 0,
    };
    const userLocation = buildUserLocation(location, tripDestination);

    // Fetch weather (non-blocking, with fallback)
    const weather = await getWeather(userLocation.lat, userLocation.lng);

    // Build complete context
    const context: ITripContext = {
      user: {
        id: userId,
        location: userLocation,
        preferences: {
          travel_style: profile?.travel_style || "balanced",
          dietary: profile?.dietary || [],
          interests: profile?.interests || [],
          walking_tolerance: profile?.walking_tolerance || "moderate",
        },
      },
      trip: {
        id: trip.id,
        destination: trip.destination,
        destination_lat: trip.destination_lat || 0,
        destination_lng: trip.destination_lng || 0,
        day_number: currentDayNumber,
        total_days: totalDays,
        timezone: timezone,
      },
      temporal: {
        current_time: now.toISOString(),
        time_of_day: timeOfDay,
        local_timezone: timezone,
      },
      environment: {
        weather: weather,
      },
      schedule: {
        next_activity: nextActivityResult?.next,
        time_until_next: nextActivityResult?.timeUntilNext,
        today_activities: todayActivities,
      },
    };

    // Cache the result
    contextCache.set(cacheKey, { data: context, timestamp: Date.now() });

    return { context };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[contextBuilder] Error building context: ${errorMessage}`);
    return { context: null, error: errorMessage };
  }
};

/**
 * Clear context cache (useful for testing)
 */
export const clearContextCache = (): void => {
  contextCache.clear();
};
