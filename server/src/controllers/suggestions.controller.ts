import { Request, Response } from "express";
import { supabase } from "../config.js";
import {
  generateActivitySuggestions,
  withRateLimit,
  ActivitySuggestion,
} from "../utils/aiService.js";
import { matchPlace } from "../utils/placeMatching.js";
import { v4 as uuidv4 } from "uuid";

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
      `🎨 [Suggestions API] Interests: ${body.interests?.join(", ") || "general"}`
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
      console.error("❌ [Suggestions API] Error checking existing ideas:", checkError);
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
      console.log(`✅ [Suggestions API] Generated ${suggestions.length} suggestions`);
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
          console.error(`   ❌ Failed to save: ${suggestion.name}`, insertError);
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
