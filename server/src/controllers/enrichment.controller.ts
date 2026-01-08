import { Request, Response } from "express";
import { EnrichmentRequest, EnrichmentResponse } from "../types/interface.js";
import { canUnfurlUrl, unfurlUrl } from "../utils/unfurl.js";
import { matchPlace } from "../utils/placeMatching.js";
import { generateAIEnrichment, withRateLimit } from "../utils/aiService.js";

export const enrich = async (request: Request, response: Response) => {
  console.log("\n🚀 [Enrichment API] ========== NEW REQUEST ==========");

  try {
    const body: EnrichmentRequest = request.body;

    console.log(`📝 [Enrichment API] URL: ${body.url}`);
    console.log(`📍 [Enrichment API] Destination: ${body.trip.destination}`);
    console.log(`💬 [Enrichment API] Comment: ${body.comment || "(none)"}`);

    if (!body.url || typeof body.url !== "string") {
      console.error("❌ [Enrichment API] Invalid URL format");
      return response.status(400).json({
        error: "URL is required and must be a string",
      });
    }

    if (!canUnfurlUrl(body.url)) {
      console.error("❌ [Enrichment API] Unsupported URL platform");
      return response.status(400).json({
        error: "Invalid URL. Only TikTok and YouTube Shorts are supported.",
      });
    }

    console.log("\n📱 [Enrichment API] Step 1: Unfurling URL...");
    const unfurlData = await unfurlUrl(body.url);
    if (!unfurlData) {
      console.error("❌ [Enrichment API] Failed to unfurl URL");
      return response.status(400).json({
        error: "Failed to extract metadata from URL",
      });
    }
    console.log(`✅ [Enrichment API] Unfurled: "${unfurlData.title}"`);

    console.log("\n🤖 [Enrichment API] Step 2: AI Enrichment...");
    let aiData;
    try {
      aiData = await withRateLimit(() =>
        generateAIEnrichment({
          videoTitle: unfurlData.title,
          videoDescription: unfurlData.description,
          videoThumbnail: unfurlData.thumbnail,
          platform: unfurlData.platform,
          userComment: body.comment,
          tripDestination: body.trip.destination,
          tripDates: body.trip.dates,
          userProfile: body.profile,
        })
      );
      console.log(
        `✅ [Enrichment API] AI Summary: "${aiData.summary.substring(
          0,
          50
        )}..."`
      );
      console.log(`   Tags: ${aiData.tags.join(", ")}`);
      console.log(`   Place Query: "${aiData.placeQuery}"`);
    } catch (aiError) {
      console.error("❌ [Enrichment API] AI enrichment failed:", aiError);
      return response.json({
        unfurl: {
          title: unfurlData.title,
          thumbnail: unfurlData.thumbnail,
          platform: unfurlData.platform,
          embedHtml: unfurlData.embedHtml,
          iframeUrl: unfurlData.iframeUrl,
        },
        ai: {
          summary:
            "AI enrichment temporarily unavailable. Please add details manually.",
          tags: [],
          placeQuery: unfurlData.title,
          iconType: "other",
        },
        error: "AI enrichment failed",
      });
    }

    console.log("\n🗺️ [Enrichment API] Step 3: Place Matching...");
    let placeData;
    if (aiData.placeQuery) {
      try {
        placeData = await matchPlace(aiData.placeQuery, body.trip.destination);
        if (placeData) {
          console.log(`✅ [Enrichment API] Place matched: "${placeData.name}"`);
          console.log(`   Confidence: ${placeData.confidence}`);
        } else {
          console.log(`⚠️ [Enrichment API] No place match found`);
        }
      } catch (placeError) {
        console.error("❌ [Enrichment API] Place matching failed:", placeError);
      }
    } else {
      console.log(
        `⚠️ [Enrichment API] No place query from AI, skipping place matching`
      );
    }

    console.log("\n📦 [Enrichment API] Building response...");
    const enrichmentResponse: EnrichmentResponse = {
      unfurl: {
        title: unfurlData.title,
        thumbnail: unfurlData.thumbnail,
        platform: unfurlData.platform,
        embedHtml: unfurlData.embedHtml,
        iframeUrl: unfurlData.iframeUrl,
      },
      ai: {
        summary: aiData.summary,
        tags: aiData.tags,
        placeQuery: aiData.placeQuery,
        category: aiData.category,
        costGuess: aiData.costGuess,
        durationGuess: aiData.durationGuess,
        iconType: aiData.iconType,
      },
      ...(placeData && { place: placeData }),
    };

    console.log(`✅ [Enrichment API] ========== REQUEST COMPLETE ==========\n`);
    return response.json(enrichmentResponse);
  } catch (error) {
    console.error("❌ [Enrichment API] Unexpected error:", error);
    return response.status(500).json({
      error: "Internal server error",
    });
  }
};
