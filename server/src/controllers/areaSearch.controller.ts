import { Request, Response } from "express";
import { supabase } from "../config.js";
import {
  generateAreaSearchSuggestions,
  ActivitySuggestion,
} from "../utils/aiService.js";
import { matchPlace } from "../utils/placeMatching.js";
import { v4 as uuidv4 } from "uuid";
import { initSSE, sendSSEEvent, endSSE } from "../utils/sseHelpers.js";

interface AreaSearchRequest {
  tripId: string;
  query: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  createdBy: string;
}

export const areaSearchStream = async (
  request: Request,
  response: Response,
) => {
  console.log(
    "\n🔍 [Area Search] ========== NEW AREA SEARCH REQUEST ==========",
  );

  try {
    const body: AreaSearchRequest = request.body;

    // Validate required fields
    if (!body.tripId || !body.query || !body.bounds || !body.createdBy) {
      return response.status(400).json({
        error: "tripId, query, bounds, and createdBy are required",
      });
    }

    const { north, south, east, west } = body.bounds;
    if (
      north === undefined ||
      south === undefined ||
      east === undefined ||
      west === undefined
    ) {
      return response.status(400).json({
        error: "bounds must include north, south, east, and west",
      });
    }

    // Initialize SSE
    initSSE(response);

    console.log(`📝 [Area Search] Trip ID: ${body.tripId}`);
    console.log(`🔎 [Area Search] Query: "${body.query}"`);
    console.log(
      `📐 [Area Search] Bounds: N=${north}, S=${south}, E=${east}, W=${west}`,
    );

    // Calculate bounding box center for reverse geocoding and fallback coords
    const centerLat = (north + south) / 2;
    const centerLng = (east + west) / 2;

    // Compute radius from bbox (half-diagonal in meters) for constraining Google Places search
    const latSpan = north - south;
    const lngSpan = east - west;
    const metersPerDegLat = 111_000;
    const metersPerDegLng = 111_000 * Math.cos((centerLat * Math.PI) / 180);
    const halfDiagonalM =
      0.5 *
      Math.sqrt(
        Math.pow(latSpan * metersPerDegLat, 2) +
          Math.pow(lngSpan * metersPerDegLng, 2),
      );
    const radiusMeters = Math.max(
      2_000,
      Math.min(50_000, Math.ceil(halfDiagonalM)),
    );
    console.log(
      `📐 [Area Search] Derived radius: ${radiusMeters}m (half-diagonal)`,
    );

    // Reverse-geocode bounding box center using Nominatim
    let locationName = `${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}`;
    try {
      console.log(
        `🌍 [Area Search] Reverse geocoding center: ${centerLat}, ${centerLng}`,
      );
      const nominatimRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${centerLat}&lon=${centerLng}&zoom=14`,
        {
          headers: { "User-Agent": "TripPlannerApp/1.0" },
        },
      );
      if (nominatimRes.ok) {
        const geoData = await nominatimRes.json();
        if (geoData.display_name) {
          locationName = geoData.display_name;
          console.log(`📍 [Area Search] Location: ${locationName}`);
        }
      }
    } catch (geoError) {
      console.warn(
        "⚠️ [Area Search] Reverse geocoding failed, using raw coordinates:",
        geoError,
      );
    }

    sendSSEEvent(response, "progress", {
      step: "generating",
      message: "Generating AI suggestions for your area...",
    });

    // Generate suggestions via OpenAI
    console.log("\n🤖 [Area Search] Step 1: Generate AI suggestions...");
    let suggestions: ActivitySuggestion[];
    try {
      suggestions = await generateAreaSearchSuggestions({
        query: body.query,
        bounds: body.bounds,
        locationName,
      });
      console.log(
        `✅ [Area Search] Generated ${suggestions.length} suggestions`,
      );
    } catch (aiError) {
      console.error("❌ [Area Search] AI generation failed:", aiError);
      sendSSEEvent(response, "error", {
        error: "Failed to generate area search suggestions",
        details: aiError instanceof Error ? aiError.message : String(aiError),
      });
      endSSE(response);
      return;
    }

    // Step 2: Save each suggestion to DB and stream them
    console.log("\n💾 [Area Search] Step 2: Save suggestions to DB...");
    const suggestionIds: string[] = [];
    const ideaIds: string[] = [];

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const ideaId = uuidv4();
      ideaIds.push(ideaId);

      // Include the search query and "area_search" in tags
      const tags = [...(suggestion.tags || []), body.query, "area_search"];

      try {
        const { error: insertError } = await supabase
          .from("trip_reel_ideas")
          .insert({
            id: ideaId,
            trip_id: body.tripId,
            created_by: body.createdBy,
            source_platform: "ai_area_search",
            source_url: `ai-area-search-${ideaId}`,
            source_video_id: ideaId,
            title: suggestion.name,
            summary: suggestion.summary,
            category: suggestion.category,
            cost_bucket: suggestion.costGuess,
            duration_bucket: suggestion.durationGuess,
            tags,
            icon_type: suggestion.iconType,
            enrichment_status: "CREATED",
          });

        if (insertError) {
          console.error(
            `   ❌ Failed to save: ${suggestion.name}`,
            insertError,
          );
        } else {
          console.log(`   ✅ Saved: ${suggestion.name}`);
          suggestionIds.push(ideaId);

          sendSSEEvent(response, "suggestion", {
            suggestion: {
              id: ideaId,
              trip_id: body.tripId,
              created_by: body.createdBy,
              source_platform: "ai_area_search",
              source_url: `ai-area-search-${ideaId}`,
              source_video_id: ideaId,
              title: suggestion.name,
              summary: suggestion.summary,
              category: suggestion.category,
              cost_bucket: suggestion.costGuess,
              duration_bucket: suggestion.durationGuess,
              tags,
              icon_type: suggestion.iconType,
              enrichment_status: "ENRICHING",
            },
            progress: i + 1,
            total: suggestions.length,
          });
        }
      } catch (saveError) {
        console.error(`   ❌ Exception saving: ${suggestion.name}`, saveError);
      }
    }

    // Step 3: Enrich each with Google Places
    console.log("\n🗺️ [Area Search] Step 3: Enrich with Google Places...");

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const ideaId = ideaIds[i];
      if (!suggestionIds.includes(ideaId)) continue;

      console.log(
        `   Enriching ${i + 1}/${suggestions.length}: ${suggestion.name}`,
      );

      let placeData = null;
      if (suggestion.placeQuery) {
        try {
          placeData = await matchPlace(suggestion.placeQuery, locationName, {
            centerLat,
            centerLng,
            radiusMeters,
          });
          if (placeData) {
            // Hard bounds check: reject if place is outside the selected bbox
            const inBounds =
              placeData.lat >= south &&
              placeData.lat <= north &&
              placeData.lng >= west &&
              placeData.lng <= east;
            if (!inBounds) {
              console.log(
                `   ⚠️ Place "${placeData.name}" outside bounds (${placeData.lat},${placeData.lng}), using center fallback`,
              );
              placeData = null;
            } else {
              console.log(`   ✅ Place matched: "${placeData.name}"`);
            }
          } else {
            console.log(`   ⚠️ No place match found`);
          }
        } catch (placeError) {
          console.error(`   ❌ Place matching failed:`, placeError);
        }
      }

      // Build update data — use bounding box center as fallback coordinates
      const updateData: Record<string, unknown> = {
        enrichment_status: "DONE",
      };

      if (placeData) {
        updateData.latitude = placeData.lat;
        updateData.longitude = placeData.lng;
        updateData.place = {
          provider: placeData.provider,
          placeId: placeData.placeId,
          name: placeData.name,
          address: placeData.address,
          rating: placeData.rating,
          reviewCount: placeData.reviewCount,
          priceLevel: placeData.priceLevel,
          photoUrl: placeData.photoUrl,
          photos: placeData.photos,
        };
        updateData.location = {
          lat: placeData.lat,
          lng: placeData.lng,
          name: placeData.name,
        };
      } else {
        // Fallback: use bounding box center
        updateData.latitude = centerLat;
        updateData.longitude = centerLng;
        updateData.location = {
          lat: centerLat,
          lng: centerLng,
        };
      }

      const { error: updateError } = await supabase
        .from("trip_reel_ideas")
        .update(updateData)
        .eq("id", ideaId);

      if (updateError) {
        console.error(
          `   ❌ Failed to update: ${suggestion.name}`,
          updateError,
        );
      }

      sendSSEEvent(response, "enriched", {
        id: ideaId,
        enrichment_status: "DONE",
        ...(placeData
          ? {
              latitude: placeData.lat,
              longitude: placeData.lng,
              place: {
                provider: placeData.provider,
                placeId: placeData.placeId,
                name: placeData.name,
                address: placeData.address,
                rating: placeData.rating,
                reviewCount: placeData.reviewCount,
                priceLevel: placeData.priceLevel,
                photoUrl: placeData.photoUrl,
                photos: placeData.photos,
              },
              location: {
                lat: placeData.lat,
                lng: placeData.lng,
                name: placeData.name,
              },
            }
          : {
              latitude: centerLat,
              longitude: centerLng,
              location: {
                lat: centerLat,
                lng: centerLng,
              },
            }),
        progress: i + 1,
        total: suggestions.length,
      });
    }

    console.log(
      `\n📊 [Area Search] Results: ${suggestionIds.length} saved and enriched`,
    );
    console.log(
      `✅ [Area Search] ========== AREA SEARCH COMPLETE ==========\n`,
    );

    sendSSEEvent(response, "complete", {
      success: true,
      suggestionIds,
      total: suggestions.length,
      saved: suggestionIds.length,
    });
    endSSE(response);
  } catch (error) {
    console.error("❌ [Area Search] Unexpected error:", error);
    try {
      sendSSEEvent(response, "error", {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      });
      endSSE(response);
    } catch {
      // Response may already be closed
    }
  }
};
