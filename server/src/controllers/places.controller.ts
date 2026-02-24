import { Request, Response } from "express";
import {
  searchNearbyPlaces as searchNearbyPlacesUtil,
  getPlaceDetails as getPlaceDetailsUtil,
} from "../utils/placesSearch.js";

interface SearchNearbyRequest {
  latitude: number;
  longitude: number;
  category?: string;
  keyword?: string;
  radius?: number;
  maxResults?: number;
}

interface GetDetailsRequest {
  placeId: string;
}

/**
 * Search for nearby places
 * POST /places/search
 */
export const searchNearbyPlaces = async (
  request: Request,
  response: Response
) => {
  console.log("\n🔍 [Places Controller] ========== SEARCH REQUEST ==========");

  try {
    const body = request.body as SearchNearbyRequest;
    const { latitude, longitude, category, keyword, radius, maxResults } = body;

    // Validate required fields
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      console.error("❌ [Places Controller] Invalid coordinates");
      return response.status(400).json({
        error: "Invalid coordinates",
        details: "latitude and longitude must be numbers",
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return response.status(400).json({
        error: "Invalid latitude",
        details: "latitude must be between -90 and 90",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return response.status(400).json({
        error: "Invalid longitude",
        details: "longitude must be between -180 and 180",
      });
    }

    // Validate optional params
    const validCategories = [
      "restaurant",
      "cafe",
      "bar",
      "bakery",
      "fast_food",
      "museum",
      "attraction",
      "park",
      "landmark",
      "shopping",
      "nightlife",
      "hotel",
      "spa",
    ];

    if (category && !validCategories.includes(category)) {
      return response.status(400).json({
        error: "Invalid category",
        details: `category must be one of: ${validCategories.join(", ")}`,
      });
    }

    // Cap radius at 5km
    const safeRadius = Math.min(radius || 2000, 5000);
    // Cap results at 10
    const safeMaxResults = Math.min(maxResults || 5, 10);

    console.log(`   Latitude: ${latitude}`);
    console.log(`   Longitude: ${longitude}`);
    console.log(`   Category: ${category || "any"}`);
    console.log(`   Keyword: ${keyword || "none"}`);
    console.log(`   Radius: ${safeRadius}m`);
    console.log(`   Max Results: ${safeMaxResults}`);

    const places = await searchNearbyPlacesUtil({
      latitude,
      longitude,
      category,
      keyword,
      radius: safeRadius,
      maxResults: safeMaxResults,
    });

    console.log(`✅ [Places Controller] Returning ${places.length} places`);
    return response.json(places);
  } catch (error) {
    console.error("❌ [Places Controller] Search error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to search for places";

    // Handle specific error cases
    if (message.includes("Rate limit")) {
      return response.status(429).json({
        error: "Rate limit exceeded",
        details: "Please try again in a few moments",
        retryAfter: 60,
      });
    }

    if (message.includes("quota")) {
      return response.status(503).json({
        error: "Service temporarily unavailable",
        details: "API quota exceeded. Please try again later.",
      });
    }

    if (message.includes("not configured")) {
      return response.status(500).json({
        error: "Service configuration error",
        details: "Please contact support.",
      });
    }

    return response.status(500).json({
      error: "Search failed",
      details: message,
    });
  }
};

/**
 * Get detailed information about a specific place
 * POST /places/details
 */
export const getPlaceDetails = async (request: Request, response: Response) => {
  console.log("\n📋 [Places Controller] ========== DETAILS REQUEST ==========");

  try {
    const body = request.body as GetDetailsRequest;
    const { placeId } = body;

    // Validate required field
    if (!placeId || typeof placeId !== "string") {
      console.error("❌ [Places Controller] Missing or invalid placeId");
      return response.status(400).json({
        error: "Invalid request",
        details: "placeId is required and must be a string",
      });
    }

    console.log(`   Place ID: ${placeId}`);

    const details = await getPlaceDetailsUtil(placeId);

    if (!details) {
      console.log("ℹ️ [Places Controller] Place not found");
      return response.status(404).json({
        error: "Place not found",
        details: "The requested place could not be found",
      });
    }

    console.log(`✅ [Places Controller] Returning details for "${details.name}"`);
    return response.json(details);
  } catch (error) {
    console.error("❌ [Places Controller] Details error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to get place details";

    // Handle specific error cases
    if (message.includes("Rate limit")) {
      return response.status(429).json({
        error: "Rate limit exceeded",
        details: "Please try again in a few moments",
        retryAfter: 60,
      });
    }

    if (message.includes("quota")) {
      return response.status(503).json({
        error: "Service temporarily unavailable",
        details: "API quota exceeded. Please try again later.",
      });
    }

    return response.status(500).json({
      error: "Failed to get place details",
      details: message,
    });
  }
};
