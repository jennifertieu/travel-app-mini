import { PlaceReview } from "../types/interface.js";

// Category to Google Places type mapping
const CATEGORY_TYPE_MAP: Record<string, string> = {
  restaurant: "restaurant",
  cafe: "cafe",
  bar: "bar",
  bakery: "bakery",
  fast_food: "meal_takeaway",
  museum: "museum",
  attraction: "tourist_attraction",
  park: "park",
  landmark: "point_of_interest",
  shopping: "shopping_mall",
  nightlife: "night_club",
  hotel: "lodging",
  spa: "spa",
};

export interface NearbyPlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  types: string[];
  category: string;
  distanceMeters: number;
  isOpen?: boolean;
  photoUrl?: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  phoneNumber?: string;
  website?: string;
  openingHours?: {
    isOpen: boolean;
    weekdayText: string[];
  };
  reviews?: PlaceReview[];
  photos?: string[];
}

interface SearchNearbyParams {
  latitude: number;
  longitude: number;
  category?: string;
  keyword?: string;
  radius?: number;
  maxResults?: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
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
}

/**
 * Get Google Places photo URL from photo reference
 */
function getPlacePhotoUrl(
  photoReference: string,
  maxWidth: number = 400
): string | null {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return null;
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

/**
 * Map Google place types to a simplified category
 */
function mapToCategory(types: string[]): string {
  const typeToCategory: Record<string, string> = {
    restaurant: "restaurant",
    cafe: "cafe",
    bar: "bar",
    bakery: "bakery",
    meal_takeaway: "fast_food",
    meal_delivery: "fast_food",
    museum: "museum",
    tourist_attraction: "attraction",
    park: "park",
    point_of_interest: "landmark",
    shopping_mall: "shopping",
    store: "shopping",
    night_club: "nightlife",
    lodging: "hotel",
    spa: "spa",
  };

  for (const type of types) {
    if (typeToCategory[type]) {
      return typeToCategory[type];
    }
  }
  return "place";
}

/**
 * Search for nearby places using Google Places Nearby Search API
 */
export async function searchNearbyPlaces(
  params: SearchNearbyParams
): Promise<NearbyPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const {
    latitude,
    longitude,
    category,
    keyword,
    radius = 2000,
    maxResults = 5,
  } = params;

  console.log("\n🔍 [Places Search] ========== NEARBY SEARCH ==========");
  console.log(`   Coordinates: ${latitude}, ${longitude}`);
  console.log(`   Category: ${category || "any"}`);
  console.log(`   Keyword: ${keyword || "none"}`);
  console.log(`   Radius: ${radius}m`);
  console.log(`   API Key configured: ${!!apiKey}`);

  if (!apiKey) {
    console.warn("⚠️ [Places Search] GOOGLE_PLACES_API_KEY not configured");
    throw new Error("Google Places API key not configured");
  }

  try {
    const searchParams = new URLSearchParams({
      location: `${latitude},${longitude}`,
      radius: radius.toString(),
      key: apiKey,
    });

    // Add type if category is specified
    if (category && CATEGORY_TYPE_MAP[category]) {
      searchParams.set("type", CATEGORY_TYPE_MAP[category]);
    }

    // Add keyword for free-text search
    if (keyword) {
      searchParams.set("keyword", keyword);
    }

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${searchParams}`;
    console.log(`🌐 [Places Search] Calling Google Nearby Search API...`);

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        console.error("❌ [Places Search] Rate limit exceeded");
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      console.error(`❌ [Places Search] API error: ${response.status}`);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [Places Search] Response status: ${data.status}`);

    if (data.status === "OVER_QUERY_LIMIT") {
      console.error("❌ [Places Search] Quota exceeded");
      throw new Error("API quota exceeded. Please try again later.");
    }

    if (data.status === "ZERO_RESULTS" || !data.results?.length) {
      console.log("ℹ️ [Places Search] No results found");
      return [];
    }

    if (data.status !== "OK") {
      console.error(`❌ [Places Search] API status: ${data.status}`);
      throw new Error(`Google Places API returned: ${data.status}`);
    }

    console.log(`   Found ${data.results.length} results`);

    // Map and sort by distance
    const places: NearbyPlace[] = data.results
      .slice(0, maxResults)
      .map((place: any) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

        return {
          placeId: place.place_id,
          name: place.name,
          address: place.vicinity || place.formatted_address || "",
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          rating: place.rating,
          reviewCount: place.user_ratings_total,
          priceLevel: place.price_level,
          types: place.types || [],
          category: mapToCategory(place.types || []),
          distanceMeters: Math.round(distance),
          isOpen: place.opening_hours?.open_now,
          photoUrl: place.photos?.[0]?.photo_reference
            ? getPlacePhotoUrl(place.photos[0].photo_reference)
            : undefined,
        };
      })
      .sort((a: NearbyPlace, b: NearbyPlace) => a.distanceMeters - b.distanceMeters);

    console.log(`✅ [Places Search] Returning ${places.length} places`);
    return places;
  } catch (error) {
    console.error("❌ [Places Search] Search failed:", error);
    throw error;
  }
}

/**
 * Get detailed place information including hours, reviews, and contact info
 */
export async function getPlaceDetails(
  placeId: string
): Promise<PlaceDetails | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  console.log("\n📋 [Place Details] ========== FETCHING DETAILS ==========");
  console.log(`   Place ID: ${placeId}`);
  console.log(`   API Key configured: ${!!apiKey}`);

  if (!apiKey) {
    console.warn("⚠️ [Place Details] GOOGLE_PLACES_API_KEY not configured");
    throw new Error("Google Places API key not configured");
  }

  try {
    const fields = [
      "place_id",
      "name",
      "formatted_address",
      "geometry",
      "rating",
      "user_ratings_total",
      "price_level",
      "formatted_phone_number",
      "website",
      "opening_hours",
      "reviews",
      "photos",
    ].join(",");

    const params = new URLSearchParams({
      place_id: placeId,
      fields,
      key: apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
    console.log(`🌐 [Place Details] Calling Google Place Details API...`);

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        console.error("❌ [Place Details] Rate limit exceeded");
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      console.error(`❌ [Place Details] API error: ${response.status}`);
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [Place Details] Response status: ${data.status}`);

    if (data.status === "NOT_FOUND") {
      console.log("ℹ️ [Place Details] Place not found");
      return null;
    }

    if (data.status !== "OK") {
      console.error(`❌ [Place Details] API status: ${data.status}`);
      throw new Error(`Google Places API returned: ${data.status}`);
    }

    const place = data.result;

    // Map reviews
    const reviews: PlaceReview[] | undefined = place.reviews?.map(
      (review: any) => ({
        authorName: review.author_name,
        authorUrl: review.author_url,
        rating: review.rating,
        text: review.text,
        time: review.time,
        relativeTimeDescription: review.relative_time_description,
        profilePhotoUrl: review.profile_photo_url,
        language: review.language,
      })
    );

    // Map photos
    const photos: string[] | undefined = place.photos
      ?.slice(0, 5)
      .map((photo: any) => getPlacePhotoUrl(photo.photo_reference, 800))
      .filter((url: string | null): url is string => url !== null);

    const details: PlaceDetails = {
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      priceLevel: place.price_level,
      phoneNumber: place.formatted_phone_number,
      website: place.website,
      openingHours: place.opening_hours
        ? {
            isOpen: place.opening_hours.open_now ?? false,
            weekdayText: place.opening_hours.weekday_text || [],
          }
        : undefined,
      reviews,
      photos,
    };

    console.log(`✅ [Place Details] Successfully fetched details for "${place.name}"`);
    console.log(`   Rating: ${details.rating || "N/A"}`);
    console.log(`   Reviews: ${reviews?.length || 0}`);
    console.log(`   Photos: ${photos?.length || 0}`);

    return details;
  } catch (error) {
    console.error("❌ [Place Details] Fetch failed:", error);
    throw error;
  }
}
