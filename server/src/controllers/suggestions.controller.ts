import { Request, Response } from "express";
import { supabase } from "../config.js";
import {
  generateActivitySuggestions,
  withRateLimit,
  ActivitySuggestion,
} from "../utils/aiService.js";
import { matchPlace } from "../utils/placeMatching.js";
import { v4 as uuidv4 } from "uuid";
import { initSSE, sendSSEEvent, endSSE } from "../utils/sseHelpers.js";

interface GenerateSuggestionsRequest {
  tripId: string;
  destination: string;
  durationDays: number | null;
  budgetLevel: string | null;
  interests: string[] | null;
  createdBy: string;
}

export const generateSuggestions = async (
  request: Request,
  response: Response
) => {
  console.log(
    "\n🚀 [Suggestions API] ========== NEW GENERATION REQUEST =========="
  );

  try {
    const body: GenerateSuggestionsRequest = request.body;

    console.log(`📝 [Suggestions API] Trip ID: ${body.tripId}`);
    console.log(`📍 [Suggestions API] Destination: ${body.destination}`);
    console.log(`📅 [Suggestions API] Duration: ${body.durationDays} days`);
    console.log(`💰 [Suggestions API] Budget: ${body.budgetLevel || "any"}`);
    console.log(
      `🎨 [Suggestions API] Interests: ${
        body.interests?.join(", ") || "general"
      }`
    );

    if (!body.tripId || !body.destination) {
      console.error("❌ [Suggestions API] Missing required fields");
      return response.status(400).json({
        error: "tripId and destination are required",
      });
    }

    // Check if suggestions already exist for this trip
    const { data: existingIdeas, error: checkError } = await supabase
      .from("trip_reel_ideas")
      .select("id")
      .eq("trip_id", body.tripId)
      .eq("source_platform", "ai_generated");

    if (checkError) {
      console.error(
        "❌ [Suggestions API] Error checking existing ideas:",
        checkError
      );
    }

    if (existingIdeas && existingIdeas.length > 0) {
      console.log(
        `⚠️ [Suggestions API] ${existingIdeas.length} AI suggestions already exist for this trip, skipping generation`
      );
      return response.json({
        success: true,
        suggestionIds: existingIdeas.map((idea) => idea.id),
        message: "Suggestions already generated",
      });
    }

    console.log("\n🤖 [Suggestions API] Step 1: Generate AI suggestions...");
    let suggestions: ActivitySuggestion[];
    try {
      suggestions = await withRateLimit(() =>
        generateActivitySuggestions({
          destination: body.destination,
          durationDays: body.durationDays,
          budgetLevel: body.budgetLevel,
          interests: body.interests,
        })
      );
      console.log(
        `✅ [Suggestions API] Generated ${suggestions.length} suggestions`
      );
    } catch (aiError) {
      console.error("❌ [Suggestions API] AI generation failed:", aiError);
      return response.status(500).json({
        error: "Failed to generate AI suggestions",
        details: aiError instanceof Error ? aiError.message : String(aiError),
      });
    }

    console.log("\n🗺️ [Suggestions API] Step 2: Enrich with Google Places...");
    const enrichedSuggestions = [];

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      console.log(
        `   Processing ${i + 1}/${suggestions.length}: ${suggestion.name}`
      );

      let placeData = null;
      if (suggestion.placeQuery) {
        try {
          placeData = await matchPlace(suggestion.placeQuery, body.destination);
          if (placeData) {
            console.log(`   ✅ Place matched: "${placeData.name}"`);
          } else {
            console.log(`   ⚠️ No place match found`);
          }
        } catch (placeError) {
          console.error(`   ❌ Place matching failed:`, placeError);
        }
      }

      enrichedSuggestions.push({
        suggestion,
        placeData,
      });
    }

    console.log("\n💾 [Suggestions API] Step 3: Save to database...");
    const suggestionIds: string[] = [];
    const errors: any[] = [];

    for (const { suggestion, placeData } of enrichedSuggestions) {
      const ideaId = uuidv4();

      try {
        const { error: insertError } = await supabase
          .from("trip_reel_ideas")
          .insert({
            id: ideaId,
            trip_id: body.tripId,
            created_by: body.createdBy,
            source_platform: "ai_generated",
            source_url: `ai-suggestion-${ideaId}`,
            source_video_id: ideaId, // Use unique ID to avoid constraint violation
            title: suggestion.name,
            summary: suggestion.summary,
            category: suggestion.category,
            cost_bucket: suggestion.costGuess,
            duration_bucket: suggestion.durationGuess,
            tags: suggestion.tags,
            icon_type: suggestion.iconType,
            enrichment_status: "DONE",
            ...(placeData && {
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
              },
            }),
          });

        if (insertError) {
          console.error(
            `   ❌ Failed to save: ${suggestion.name}`,
            insertError
          );
          errors.push({ name: suggestion.name, error: insertError });
        } else {
          console.log(`   ✅ Saved: ${suggestion.name}`);
          suggestionIds.push(ideaId);
        }
      } catch (saveError) {
        console.error(`   ❌ Exception saving: ${suggestion.name}`, saveError);
        errors.push({ name: suggestion.name, error: saveError });
      }
    }

    console.log(
      `\n📊 [Suggestions API] Results: ${suggestionIds.length} saved, ${errors.length} failed`
    );
    console.log(
      `✅ [Suggestions API] ========== REQUEST COMPLETE ==========\n`
    );

    return response.json({
      success: true,
      suggestionIds,
      total: suggestions.length,
      saved: suggestionIds.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ [Suggestions API] Unexpected error:", error);
    return response.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const generateSuggestionsStream = async (
  request: Request,
  response: Response
) => {
  console.log(
    "\n🚀 [Suggestions API] ========== NEW STREAMING GENERATION REQUEST =========="
  );

  try {
    const body: GenerateSuggestionsRequest = request.body;

    if (!body.tripId || !body.destination) {
      return response.status(400).json({
        error: "tripId and destination are required",
      });
    }

    initSSE(response);

    console.log(`📝 [Suggestions API] Trip ID: ${body.tripId}`);
    console.log(`📍 [Suggestions API] Destination: ${body.destination}`);
    console.log(`📅 [Suggestions API] Duration: ${body.durationDays} days`);
    console.log(`💰 [Suggestions API] Budget: ${body.budgetLevel || "any"}`);
    console.log(
      `🎨 [Suggestions API] Interests: ${
        body.interests?.join(", ") || "general"
      }`
    );

    // Check if suggestions already exist for this trip
    const { data: existingIdeas, error: checkError } = await supabase
      .from("trip_reel_ideas")
      .select("id")
      .eq("trip_id", body.tripId)
      .eq("source_platform", "ai_generated");

    if (checkError) {
      console.error(
        "❌ [Suggestions API] Error checking existing ideas:",
        checkError
      );
    }

    if (existingIdeas && existingIdeas.length > 0) {
      sendSSEEvent(response, "complete", {
        success: true,
        suggestionIds: existingIdeas.map((idea) => idea.id),
        message: "Suggestions already generated",
      });
      endSSE(response);
      return;
    }

    sendSSEEvent(response, "progress", {
      step: "generating",
      message: "Generating AI suggestions...",
    });

    console.log("\n🤖 [Suggestions API] Step 1: Generate AI suggestions...");
    let suggestions: ActivitySuggestion[];
    try {
      suggestions = await withRateLimit(() =>
        generateActivitySuggestions({
          destination: body.destination,
          durationDays: body.durationDays,
          budgetLevel: body.budgetLevel,
          interests: body.interests,
        })
      );
      console.log(
        `✅ [Suggestions API] Generated ${suggestions.length} suggestions`
      );
    } catch (aiError) {
      console.error("❌ [Suggestions API] AI generation failed:", aiError);
      sendSSEEvent(response, "error", {
        error: "Failed to generate AI suggestions",
        details: aiError instanceof Error ? aiError.message : String(aiError),
      });
      endSSE(response);
      return;
    }

    // Step 2: Save all suggestions to DB immediately (without place data) and stream them
    console.log(
      "\n💾 [Suggestions API] Step 2: Save basic suggestions to DB..."
    );
    const suggestionIds: string[] = [];
    const ideaIds: string[] = [];
    const errors: Array<{ name: string; error: unknown }> = [];

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const ideaId = uuidv4();
      ideaIds.push(ideaId);

      try {
        const { error: insertError } = await supabase
          .from("trip_reel_ideas")
          .insert({
            id: ideaId,
            trip_id: body.tripId,
            created_by: body.createdBy,
            source_platform: "ai_generated",
            source_url: `ai-suggestion-${ideaId}`,
            source_video_id: ideaId,
            title: suggestion.name,
            summary: suggestion.summary,
            category: suggestion.category,
            cost_bucket: suggestion.costGuess,
            duration_bucket: suggestion.durationGuess,
            tags: suggestion.tags,
            icon_type: suggestion.iconType,
            enrichment_status: "CREATED",
          });

        if (insertError) {
          console.error(
            `   ❌ Failed to save: ${suggestion.name}`,
            insertError
          );
          errors.push({ name: suggestion.name, error: insertError });
        } else {
          console.log(`   ✅ Saved basic: ${suggestion.name}`);
          suggestionIds.push(ideaId);
          // Send basic suggestion immediately — no photo/location yet
          // Use "ENRICHING" in the SSE payload so the frontend shows shimmer
          sendSSEEvent(response, "suggestion", {
            suggestion: {
              id: ideaId,
              trip_id: body.tripId,
              created_by: body.createdBy,
              source_platform: "ai_generated",
              source_url: `ai-suggestion-${ideaId}`,
              source_video_id: ideaId,
              title: suggestion.name,
              summary: suggestion.summary,
              category: suggestion.category,
              cost_bucket: suggestion.costGuess,
              duration_bucket: suggestion.durationGuess,
              tags: suggestion.tags,
              icon_type: suggestion.iconType,
              enrichment_status: "ENRICHING",
            },
            progress: i + 1,
            total: suggestions.length,
          });
        }
      } catch (saveError) {
        console.error(`   ❌ Exception saving: ${suggestion.name}`, saveError);
        errors.push({ name: suggestion.name, error: saveError });
      }
    }

    // Step 3: Enrich each with Google Places and send updates
    console.log("\n🗺️ [Suggestions API] Step 3: Enrich with Google Places...");
    const streamStartTime = Date.now();

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const ideaId = ideaIds[i];
      if (!suggestionIds.includes(ideaId)) continue; // skip failed saves

      const itemStartTime = Date.now();
      console.log(
        `   Enriching ${i + 1}/${suggestions.length}: ${suggestion.name} [+${
          itemStartTime - streamStartTime
        }ms]`
      );

      let placeData = null;
      if (suggestion.placeQuery) {
        try {
          placeData = await matchPlace(suggestion.placeQuery, body.destination);
          if (placeData) {
            console.log(`   ✅ Place matched: "${placeData.name}"`);
          } else {
            console.log(`   ⚠️ No place match found`);
          }
        } catch (placeError) {
          console.error(`   ❌ Place matching failed:`, placeError);
        }
      }

      // Update DB with place data
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
      }

      const { error: updateError } = await supabase
        .from("trip_reel_ideas")
        .update(updateData)
        .eq("id", ideaId);

      if (updateError) {
        console.error(
          `   ❌ Failed to update: ${suggestion.name}`,
          updateError
        );
      }

      const elapsed = Date.now() - streamStartTime;
      console.log(
        `   📡 Sending SSE enriched event ${i + 1}/${
          suggestions.length
        } at +${elapsed}ms`
      );

      // Send enriched update
      sendSSEEvent(response, "enriched", {
        id: ideaId,
        enrichment_status: "DONE",
        ...(placeData && {
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
        }),
        progress: i + 1,
        total: suggestions.length,
      });
    }

    console.log(
      `\n📊 [Suggestions API] Results: ${suggestionIds.length} saved, ${errors.length} failed`
    );
    console.log(
      `✅ [Suggestions API] ========== STREAMING REQUEST COMPLETE ==========\n`
    );

    sendSSEEvent(response, "complete", {
      success: true,
      suggestionIds,
      total: suggestions.length,
      saved: suggestionIds.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
    endSSE(response);
  } catch (error) {
    console.error("❌ [Suggestions API] Unexpected error:", error);
    sendSSEEvent(response, "error", {
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
    endSSE(response);
  }
};
