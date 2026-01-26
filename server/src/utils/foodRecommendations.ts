import { GOOGLE_MAPS_PLATFORM_API_KEY } from "../config.js";
import {
  ITripContext,
  IFoodRecommendation,
  IFoodResponse,
  IGooglePlaceResult,
} from "../types/interface.js";

// Cache for nearby places (15-minute TTL)
const placesCache = new Map<
  string,
  { data: IGooglePlaceResult[]; timestamp: number }
>();
const PLACES_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Cache for place details with location tracking
// Strategy: Additive caching with location-based invalidation and time-based refresh
interface CachedPlaceDetails {
  data: PlaceDetailsData;
  timestamp: number;
  location?: { lat: number; lng: number }; // Store location for invalidation
}

const placeDetailsCache = new Map<string, CachedPlaceDetails>();

// Cache refresh threshold: refresh top candidates if older than this
const PLACE_DETAILS_REFRESH_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours

// Location invalidation threshold: clear cache entries >50km from current location
const LOCATION_INVALIDATION_DISTANCE_KM = 50;

interface PlaceDetailsData {
  editorialSummary?: string;
  reviews?: Array<{ text: string }>;
}

/**
 * Get photo URL from Google Places photo reference
 */
const getPhotoUrl = (photoReference: string): string => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${GOOGLE_MAPS_PLATFORM_API_KEY}`;
};

/**
 * Calculate walking distance in km using Haversine formula
 * (Moved up for use in location invalidation)
 */
const calculateDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if cached place details should be invalidated based on location
 */
const shouldInvalidateByLocation = (
  cachedLocation: { lat: number; lng: number } | undefined,
  currentLocation: { lat: number; lng: number }
): boolean => {
  if (!cachedLocation) return false; // No location stored, keep cache

  const distanceKm = calculateDistanceKm(
    cachedLocation.lat,
    cachedLocation.lng,
    currentLocation.lat,
    currentLocation.lng
  );

  return distanceKm > LOCATION_INVALIDATION_DISTANCE_KM;
};

/**
 * Fetch place details from Google Places API (Legacy)
 * Uses Essentials tier fields: editorial_summary, reviews
 * Cost: $5 per 1,000 requests (first 10,000 free/month)
 * 
 * Caching Strategy:
 * - Additive: Never delete cache entries until trip ends, only add/update
 * - Location-based invalidation: Skip cache if entry is >50km from current location
 * - Time-based refresh: Refresh if cache is >2 hours old (handled by caller)
 * 
 * This fetches editorial summary and reviews to improve dietary matching accuracy.
 * Reviews often mention dietary options (e.g., "great vegetarian options", "gluten-free menu")
 */
const fetchPlaceDetails = async (
  placeId: string,
  placeLocation: { lat: number; lng: number },
  forceRefresh: boolean = false
): Promise<PlaceDetailsData | null> => {
  // Check cache first (additive strategy: never delete, only add/update)
  const cached = placeDetailsCache.get(placeId);

  if (cached && !forceRefresh) {
    // Check location-based invalidation
    if (shouldInvalidateByLocation(cached.location, placeLocation)) {
      // Cache entry is too far away, but we still use it (additive strategy)
      // The caller will decide if refresh is needed based on time
      console.log(
        `[Food Recommendations] Cache entry for ${placeId} is >${LOCATION_INVALIDATION_DISTANCE_KM}km away, but keeping (additive cache)`
      );
    } else {
      // Cache is valid and location is close enough
      return cached.data;
    }
  }

  // Fetch from API (either cache miss, force refresh, or location invalidated)
  const apiKey = GOOGLE_MAPS_PLATFORM_API_KEY;
  if (!apiKey) {
    // Return cached data if available, even if location is far
    return cached?.data || null;
  }

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "editorial_summary,reviews",
      key: apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        console.error("[Food Recommendations] Place Details rate limit");
        // Return cached data if available
        return cached?.data || null;
      }
      console.error(
        `[Food Recommendations] Place Details API error: ${response.status}`
      );
      // Return cached data if available
      return cached?.data || null;
    }

    const data = await response.json();
    if (data.status !== "OK") {
      console.error(
        `[Food Recommendations] Place Details status: ${data.status}`
      );
      // Return cached data if available
      return cached?.data || null;
    }

    const result: PlaceDetailsData = {
      editorialSummary: data.result?.editorial_summary?.overview,
      reviews: data.result?.reviews?.map((r: any) => ({
        text: r.text || "",
      })),
    };

    // Additive caching: Always add/update cache (never delete)
    placeDetailsCache.set(placeId, {
      data: result,
      timestamp: Date.now(),
      location: placeLocation, // Store location for future invalidation checks
    });

    return result;
  } catch (error: any) {
    console.error(
      `[Food Recommendations] Place Details fetch failed: ${error.message}`
    );
    // Return cached data if available
    return cached?.data || null;
  }
};

/**
 * Determine food type based on place types
 */
const determineFoodType = (
  types: string[]
): "restaurant" | "cafe" | "quick_bite" | "park_rest" => {
  if (types.includes("cafe")) return "cafe";
  if (types.includes("bakery") || types.includes("meal_takeaway"))
    return "quick_bite";
  if (types.includes("park")) return "park_rest";
  return "restaurant";
};

/**
 * Check if text content (name, description, reviews) matches dietary restrictions
 */
const checkTextForDietaryMatch = (
  text: string,
  userDietary: string[]
): boolean => {
  if (userDietary.length === 0) return false;

  const textLower = text.toLowerCase();

  // Common dietary keywords that might appear in names/descriptions/reviews
  const dietaryKeywords: Record<string, string[]> = {
    vegetarian: ["vegetarian", "veggie", "vegg", "meat-free", "no meat"],
    vegan: ["vegan", "plant-based", "dairy-free", "egg-free"],
    "gluten-free": [
      "gluten-free",
      "gluten free",
      "gf",
      "celiac",
      "gluten friendly",
    ],
    halal: ["halal"],
    kosher: ["kosher"],
    organic: ["organic"],
    "dairy-free": ["dairy-free", "dairy free", "lactose-free", "no dairy"],
    "nut-free": ["nut-free", "nut free", "peanut-free", "tree nut free"],
  };

  // Check each user dietary preference
  for (const dietary of userDietary) {
    const dietaryLower = dietary.toLowerCase();

    // Direct match
    if (textLower.includes(dietaryLower)) {
      return true;
    }

    // Check for related keywords
    const keywords = dietaryKeywords[dietaryLower];
    if (keywords) {
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Check if place matches user's dietary restrictions
 * 
 * Strategy:
 * 1. First check place name (fast, free)
 * 2. If no match and placeDetails provided, check description/reviews
 * 3. Falls back to name-only if Place Details unavailable
 * 
 * NOTE: Google Places API does not provide structured dietary restriction types.
 * This uses keyword matching on name, description, and reviews.
 */
const checkDietaryMatch = (
  placeName: string,
  placeTypes: string[],
  userDietary: string[],
  placeDetails?: PlaceDetailsData | null
): boolean => {
  if (userDietary.length === 0) return true;

  // Step 1: Check name (always available, free)
  if (checkTextForDietaryMatch(placeName, userDietary)) {
    return true;
  }

  // Step 2: Check Place Details if available (costs $0.005 per place)
  if (placeDetails) {
    // Check editorial summary
    if (
      placeDetails.editorialSummary &&
      checkTextForDietaryMatch(placeDetails.editorialSummary, userDietary)
    ) {
      return true;
    }

    // Check reviews (sample first 3 reviews to avoid processing too much)
    if (placeDetails.reviews) {
      const reviewText = placeDetails.reviews
        .slice(0, 3)
        .map((r) => r.text)
        .join(" ");
      if (checkTextForDietaryMatch(reviewText, userDietary)) {
        return true;
      }
    }
  }

  // No match found
  return false;
};

/**
 * Get suggestion reason based on time of day
 */
const getSuggestionReason = (
  timeOfDay: "morning" | "afternoon" | "evening"
): string => {
  switch (timeOfDay) {
    case "morning":
      return "Good morning! Time for breakfast or a coffee break.";
    case "afternoon":
      return "It's lunchtime - let's find you something delicious!";
    case "evening":
      return "Evening is here - time to explore dinner options.";
    default:
      return "Here are some food options nearby.";
  }
};

/**
 * Fetch nearby restaurants/cafes from Google Places API
 */
const fetchNearbyPlaces = async (
  lat: number,
  lng: number,
  type: string = "restaurant"
): Promise<IGooglePlaceResult[]> => {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}:${type}`;
  const cached = placesCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < PLACES_CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1500&type=${type}&key=${GOOGLE_MAPS_PLATFORM_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `[Food Recommendations] Places API error: ${response.status}`
      );
      return [];
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error(`[Food Recommendations] Places API status: ${data.status}`);
      return [];
    }

    const results = data.results || [];
    placesCache.set(cacheKey, { data: results, timestamp: Date.now() });

    return results;
  } catch (error: any) {
    console.error(
      `[Food Recommendations] Failed to fetch places: ${error.message}`
    );
    return [];
  }
};

/**
 * Clear all caches for a trip (called when trip ends)
 * This helps free up memory and ensures fresh data for future trips
 */
export const clearCachesForTrip = (tripId: string): void => {
  console.log(`[Food Recommendations] Clearing caches for trip ${tripId} (trip ended)`);
  
  // Clear nearby places cache (location-based, may be stale after trip ends)
  placesCache.clear();
  
  // Clear place details cache (free up memory after trip ends)
  placeDetailsCache.clear();
  
  console.log(`[Food Recommendations] Caches cleared for trip ${tripId}`);
};

/**
 * Get food recommendations based on trip context
 * This is a utility function (NOT an AI agent)
 * 
 * Cost optimization: Only fetches Place Details for top 5 candidates
 * to balance accuracy vs API costs ($0.025 per request vs $0.05 for all 10)
 */
export const getFoodRecommendations = async (
  context: ITripContext
): Promise<IFoodResponse> => {
  const { user, temporal, trip } = context;
  const { location, preferences } = user;
  
  // Check if trip has ended - if current day is past total days, trip has ended
  // Clear caches to free up memory and ensure fresh data for future trips
  if (trip.day_number > trip.total_days) {
    clearCachesForTrip(trip.id);
  }

  // Determine what type of places to search for based on time
  let placeTypes: string[];
  switch (temporal.time_of_day) {
    case "morning":
      placeTypes = ["cafe", "bakery", "restaurant"];
      break;
    case "afternoon":
      placeTypes = ["restaurant", "cafe"];
      break;
    case "evening":
      placeTypes = ["restaurant"];
      break;
    default:
      placeTypes = ["restaurant"];
  }

  // Fetch places for each type
  const allPlaces: IGooglePlaceResult[] = [];
  for (const type of placeTypes) {
    const places = await fetchNearbyPlaces(location.lat, location.lng, type);
    allPlaces.push(...places);
  }

  // Remove duplicates by place_id
  const uniquePlaces = allPlaces.filter(
    (place, index, self) =>
      index === self.findIndex((p) => p.place_id === place.place_id)
  );

  // Process and score places
  const recommendations: IFoodRecommendation[] = [];

  // First pass: Process all places with name-based matching (free)
  const placesWithScores = uniquePlaces.slice(0, 10).map((place) => {
    const distanceKm = calculateDistanceKm(
      location.lat,
      location.lng,
      place.geometry.location.lat,
      place.geometry.location.lng
    );

    const walkingTimeMinutes = Math.round((distanceKm / 5) * 60);
    const nameBasedMatch = checkDietaryMatch(
      place.name,
      place.types || [],
      preferences.dietary
    );

    // Score: dietary match (high priority), rating, distance
    const score =
      (nameBasedMatch ? 1000 : 0) +
      (place.rating || 0) * 100 -
      distanceKm * 10;

    return {
      place,
      distanceKm,
      walkingTimeMinutes,
      nameBasedMatch,
      score,
    };
  });

  // Sort by score to prioritize candidates
  placesWithScores.sort((a, b) => b.score - a.score);

  // Second pass: Fetch Place Details with smart refresh strategy
  // Strategy: Refresh top 3 candidates if cache is >2 hours old, otherwise use cache
  const TOP_CANDIDATES_FOR_DETAILS = 5;
  const TOP_CANDIDATES_FOR_REFRESH = 3; // Refresh top 3 if stale

  const placeDetailsPromises = placesWithScores
    .slice(0, TOP_CANDIDATES_FOR_DETAILS)
    .map(async ({ place }) => {
      const placeLocation = {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      };

      // Check if this is a top candidate that might need refresh
      const index = placesWithScores.findIndex(
        (p) => p.place.place_id === place.place_id
      );
      const isTopCandidate = index < TOP_CANDIDATES_FOR_REFRESH;

      if (isTopCandidate) {
        // Check if cache is stale (>2 hours old)
        const cached = placeDetailsCache.get(place.place_id);
        const cacheAge = cached
          ? Date.now() - cached.timestamp
          : Infinity;

        const shouldRefresh = cacheAge > PLACE_DETAILS_REFRESH_THRESHOLD;

        if (shouldRefresh) {
          console.log(
            `[Food Recommendations] Refreshing stale cache for ${place.name} (${Math.round(cacheAge / (60 * 60 * 1000))}h old)`
          );
        }

        return fetchPlaceDetails(
          place.place_id,
          placeLocation,
          shouldRefresh
        );
      } else {
        // For lower-ranked candidates, use cache if available, otherwise fetch
        return fetchPlaceDetails(place.place_id, placeLocation, false);
      }
    });

  const placeDetailsResults = await Promise.all(placeDetailsPromises);

  // Build final recommendations
  for (let i = 0; i < placesWithScores.length; i++) {
    const { place, distanceKm, walkingTimeMinutes } =
      placesWithScores[i];

    // Use Place Details if available (top 5), otherwise fall back to name-based
    const placeDetails =
      i < TOP_CANDIDATES_FOR_DETAILS ? placeDetailsResults[i] : null;

    const dietaryMatch = checkDietaryMatch(
      place.name,
      place.types || [],
      preferences.dietary,
      placeDetails
    );

    const foodType = determineFoodType(place.types || []);

    // Build reason string
    let reason = "";
    if (dietaryMatch && preferences.dietary.length > 0) {
      reason = `Matches your ${preferences.dietary.join(", ")} preference. `;
    }
    reason += `${walkingTimeMinutes} min walk, rated ${place.rating || "N/A"}★`;

    recommendations.push({
      id: place.place_id,
      name: place.name,
      type: foodType,
      cuisine: undefined, // Would need additional API call for cuisine type
      price_level: place.price_level || 2,
      distance_km: Math.round(distanceKm * 10) / 10,
      walking_time_minutes: walkingTimeMinutes,
      reason: reason,
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      },
      dietary_match: dietaryMatch,
      rating: place.rating,
      photo_url: place.photos?.[0]?.photo_reference
        ? getPhotoUrl(place.photos[0].photo_reference)
        : undefined,
    });
  }

  // Final sort by: dietary match, rating, distance
  recommendations.sort((a, b) => {
    // Dietary match first
    if (a.dietary_match !== b.dietary_match) {
      return a.dietary_match ? -1 : 1;
    }
    // Then by rating
    if ((b.rating || 0) !== (a.rating || 0)) {
      return (b.rating || 0) - (a.rating || 0);
    }
    // Then by distance
    return a.distance_km - b.distance_km;
  });

  return {
    recommendations: recommendations.slice(0, 5), // Return top 5
    suggestion_reason: getSuggestionReason(temporal.time_of_day),
  };
};

/**
 * Clear places cache (useful for testing)
 */
export const clearPlacesCache = (): void => {
  placesCache.clear();
  placeDetailsCache.clear();
};
