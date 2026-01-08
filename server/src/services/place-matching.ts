// Place matching service for enrichment pipeline
// Integrates with Google Places API for location matching

import { PlaceReview } from "./types";

interface PlaceMatchResult {
  provider: "google";
  placeId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  confidence: "low" | "medium" | "high";
  reviews?: PlaceReview[];
  photoUrl?: string;
  photos?: string[];
}

/**
 * Calculate confidence level based on match quality
 */
function calculateConfidence(
  query: string,
  placeName: string,
  rating?: number,
  reviewCount?: number
): "low" | "medium" | "high" {
  const queryLower = query.toLowerCase();
  const nameLower = placeName.toLowerCase();

  const queryWords = queryLower.split(/\s+/);
  const nameWords = nameLower.split(/\s+/);

  const firstWordMatch =
    queryWords.length > 0 &&
    nameWords.some(
      (word) => word.includes(queryWords[0]) || queryWords[0].includes(word)
    );

  const matchingWords = queryWords.filter((qWord) =>
    nameWords.some((nWord) => nWord.includes(qWord) || qWord.includes(nWord))
  );
  const overlapRatio = matchingWords.length / Math.max(queryWords.length, 1);

  if (
    overlapRatio >= 0.7 &&
    rating !== undefined &&
    rating >= 4.0 &&
    reviewCount !== undefined &&
    reviewCount >= 50
  ) {
    return "high";
  }

  if (
    (overlapRatio >= 0.5 || firstWordMatch) &&
    (rating === undefined || rating >= 3.5) &&
    (reviewCount === undefined || reviewCount >= 10)
  ) {
    return "medium";
  }

  return "low";
}

/**
 * Get Google Places photo URL from photo reference
 */
function getPlacePhotoUrl(
  photoReference: string,
  maxWidth: number = 800
): string | null {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return null;
  }

  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

/**
 * Fetch detailed place information including reviews and photos from Google Places Details API
 */
async function fetchPlaceDetails(placeId: string): Promise<{
  reviews: PlaceReview[] | null;
  photos: string[] | null;
} | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  console.log("📝 [Google Places Details] Fetching place details...");
  console.log(`   Place ID: ${placeId}`);
  console.log(`   API Key configured: ${!!apiKey}`);

  if (!apiKey) {
    console.warn("⚠️ [Google Places] API key not configured");
    return null;
  }

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      fields: "reviews,photos",
      key: apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
    console.log(`🔍 [Google Places Details] Calling API...`);

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 429) {
        console.error("❌ [Google Places] Rate limit exceeded");
        return null;
      }
      console.error(`❌ [Google Places Details] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ [Google Places Details] Response status: ${data.status}`);

    if (data.status === "OVER_QUERY_LIMIT") {
      console.error("❌ [Google Places] Quota exceeded");
      return null;
    }

    if (data.status !== "OK") {
      console.error(`❌ [Google Places Details] Status: ${data.status}`);
      return null;
    }

    const reviews = data.result?.reviews || [];
    console.log(`   Reviews found: ${reviews.length}`);

    let mappedReviews: PlaceReview[] | null = null;
    if (reviews.length > 0) {
      mappedReviews = reviews.map((review: any) => ({
        authorName: review.author_name,
        authorUrl: review.author_url,
        rating: review.rating,
        text: review.text,
        time: review.time,
        relativeTimeDescription: review.relative_time_description,
        profilePhotoUrl: review.profile_photo_url,
        language: review.language,
      }));

      console.log(
        `✅ [Google Places Details] Successfully mapped ${
          mappedReviews!.length
        } reviews`
      );
    } else {
      console.log(
        "ℹ️ [Google Places Details] No reviews available for this place"
      );
    }

    const photos = data.result?.photos || [];
    console.log(`   Photos found: ${photos.length}`);

    let photoUrls: string[] | null = null;
    if (photos.length > 0) {
      photoUrls = photos
        .slice(0, 5)
        .map((photo: any) => getPlacePhotoUrl(photo.photo_reference, 800))
        .filter((url: string | null): url is string => url !== null);

      console.log(
        `✅ [Google Places Details] Successfully generated ${
          photoUrls!.length
        } photo URLs`
      );
    } else {
      console.log(
        "ℹ️ [Google Places Details] No photos available for this place"
      );
    }

    return {
      reviews: mappedReviews,
      photos: photoUrls,
    };
  } catch (error) {
    console.error("❌ [Google Places Details] Fetch failed:", error);
    return null;
  }
}

/**
 * Search for a place using Google Places API Text Search
 */
async function searchGooglePlaces(
  query: string,
  location: string
): Promise<PlaceMatchResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  console.log("🗺️ [Google Places] Starting place search...");
  console.log(`   Query: "${query}"`);
  console.log(`   Location: "${location}"`);
  console.log(`   API Key configured: ${!!apiKey}`);

  if (!apiKey) {
    console.warn("⚠️ [Google Places] GOOGLE_PLACES_API_KEY not configured");
    return null;
  }

  try {
    const geocodeParams = new URLSearchParams({
      address: location,
      key: apiKey,
    });

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?${geocodeParams}`;
    console.log(`📍 [Google Geocoding] Geocoding location: ${location}`);

    const geocodeResponse = await fetch(geocodeUrl);

    if (!geocodeResponse.ok) {
      const status = geocodeResponse.status;
      if (status === 429) {
        console.error("❌ [Google Places] Rate limit exceeded");
        return null;
      }
      console.error(`❌ [Google Geocoding] API error: ${status}`);
      return null;
    }

    const geocodeData = await geocodeResponse.json();
    console.log(`✅ [Google Geocoding] Response status: ${geocodeData.status}`);

    if (geocodeData.status === "OVER_QUERY_LIMIT") {
      console.error("❌ [Google Places] Quota exceeded");
      return null;
    }

    if (
      !geocodeData.results ||
      geocodeData.results.length === 0 ||
      geocodeData.status !== "OK"
    ) {
      console.error(
        `❌ [Google Geocoding] Failed to geocode: ${location}, status: ${geocodeData.status}`
      );
      return null;
    }

    const locationCoords = geocodeData.results[0].geometry.location;
    console.log(
      `📍 [Google Geocoding] Coordinates: ${locationCoords.lat}, ${locationCoords.lng}`
    );

    const searchParams = new URLSearchParams({
      query: `${query} in ${location}`,
      location: `${locationCoords.lat},${locationCoords.lng}`,
      radius: "50000",
      key: apiKey,
    });

    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?${searchParams}`;
    console.log(`🔍 [Google Places] Searching for: "${query} in ${location}"`);

    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      const status = searchResponse.status;
      if (status === 429) {
        console.error("❌ [Google Places] Rate limit exceeded");
        return null;
      }
      console.error(`❌ [Google Places] API error: ${status}`);
      return null;
    }

    const searchData = await searchResponse.json();
    console.log(`✅ [Google Places] Response status: ${searchData.status}`);
    console.log(`   Results found: ${searchData.results?.length || 0}`);

    if (searchData.status === "OVER_QUERY_LIMIT") {
      console.error("❌ [Google Places] Quota exceeded");
      return null;
    }

    if (
      searchData.status === "ZERO_RESULTS" ||
      !searchData.results ||
      searchData.results.length === 0
    ) {
      console.log(
        `⚠️ [Google Places] No results found for: ${query} in ${location}`
      );
      return null;
    }

    if (searchData.status !== "OK") {
      console.error(
        `❌ [Google Places] API returned status: ${searchData.status}`
      );
      return null;
    }

    const place = searchData.results[0];
    console.log(`🎯 [Google Places] Top result: "${place.name}"`);
    console.log(`   Place ID: ${place.place_id}`);
    console.log(
      `   Rating: ${place.rating || "N/A"} (${
        place.user_ratings_total || 0
      } reviews)`
    );
    console.log(
      `   Price Level: ${
        place.price_level !== undefined
          ? "$".repeat(place.price_level + 1)
          : "N/A"
      }`
    );
    console.log(
      `   Location: ${place.geometry.location.lat}, ${place.geometry.location.lng}`
    );

    const confidence = calculateConfidence(
      query,
      place.name,
      place.rating,
      place.user_ratings_total
    );

    console.log(`   Confidence: ${confidence.toUpperCase()}`);

    const placeDetails = await fetchPlaceDetails(place.place_id);

    return {
      provider: "google",
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      priceLevel: place.price_level,
      confidence,
      reviews: placeDetails?.reviews || undefined,
      photoUrl: placeDetails?.photos?.[0] || undefined,
      photos: placeDetails?.photos || undefined,
    };
  } catch (error) {
    console.error("❌ [Google Places] Search failed:", error);
    return null;
  }
}

/**
 * Match a place using Google Places API
 */
export async function matchPlace(
  placeQuery: string,
  destination: string
): Promise<PlaceMatchResult | null> {
  if (!placeQuery || !destination) {
    return null;
  }

  return await searchGooglePlaces(placeQuery, destination);
}
