import { Response } from "express";
import {
  IAuthenticatedRequest,
  IContextRequest,
  IDecideRequest,
  IFoodRequest,
  IMapIntelligenceRequest,
  IActivityStatusRequest,
} from "../types/interface.js";
import { supabase } from "../config.js";
import { buildTripContext } from "../utils/contextBuilder.js";
import { verifyTripAccess } from "../utils/verifyTripAccess.js";
import { runDecisionAgent } from "../utils/decisionAgent.js";
import { getFoodRecommendations } from "../utils/foodRecommendations.js";
import { getMapIntelligence } from "../utils/mapIntelligence.js";

/**
 * POST /during-trip/context
 * Get current trip context for during-trip features
 */
export const getContext = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;
    const { trip_id, location } = request.body as IContextRequest;

    if (!trip_id) {
      return response.status(400).json({ error: "trip_id is required" });
    }

    // Verify trip access
    const hasAccess = await verifyTripAccess(trip_id, userId, supabase);
    if (!hasAccess) {
      return response
        .status(403)
        .json({ error: "Not authorized for this trip" });
    }

    // Build context
    const { context, error } = await buildTripContext({
      tripId: trip_id,
      userId,
      location,
      supabase,
    });

    if (error || !context) {
      return response.status(404).json({ error: error || "Trip not found" });
    }

    return response.status(200).json(context);
  } catch (error: any) {
    console.error("[getContext] Error:", error);
    return response.status(500).json({
      error: "Failed to get context",
      details: error.message,
    });
  }
};

/**
 * POST /during-trip/decide
 * Get "What Now?" decision suggestions
 */
export const getDecision = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;
    const { trip_id, location } = request.body as IDecideRequest;

    if (!trip_id) {
      return response.status(400).json({ error: "trip_id is required" });
    }

    // Verify trip access
    const hasAccess = await verifyTripAccess(trip_id, userId, supabase);
    if (!hasAccess) {
      return response
        .status(403)
        .json({ error: "Not authorized for this trip" });
    }

    // Build context
    const { context, error: contextError } = await buildTripContext({
      tripId: trip_id,
      userId,
      location,
      supabase,
    });

    if (contextError || !context) {
      return response
        .status(404)
        .json({ error: contextError || "Trip not found" });
    }

    // Run decision agent
    const decisionResponse = await runDecisionAgent(context);

    return response.status(200).json({
      ...decisionResponse,
      location_approximate: context.user.location.is_approximate,
    });
  } catch (error: any) {
    console.error("[getDecision] Error:", error);
    return response.status(500).json({
      error: "Failed to get decision suggestions",
      details: error.message,
    });
  }
};

/**
 * POST /during-trip/food
 * Get food and rest recommendations
 */
export const getFood = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;
    const { trip_id, location } = request.body as IFoodRequest;

    if (!trip_id) {
      return response.status(400).json({ error: "trip_id is required" });
    }

    // Verify trip access
    const hasAccess = await verifyTripAccess(trip_id, userId, supabase);
    if (!hasAccess) {
      return response
        .status(403)
        .json({ error: "Not authorized for this trip" });
    }

    // Build context
    const { context, error: contextError } = await buildTripContext({
      tripId: trip_id,
      userId,
      location,
      supabase,
    });

    if (contextError || !context) {
      return response
        .status(404)
        .json({ error: contextError || "Trip not found" });
    }

    // Get food recommendations
    const foodResponse = await getFoodRecommendations(context);

    return response.status(200).json(foodResponse);
  } catch (error: any) {
    console.error("[getFood] Error:", error);
    return response.status(500).json({
      error: "Failed to get food recommendations",
      details: error.message,
    });
  }
};

/**
 * POST /during-trip/map-intelligence
 * Get map annotations for activities and POIs
 */
export const getMapAnnotations = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;
    const { trip_id, location, viewport } =
      request.body as IMapIntelligenceRequest;

    if (!trip_id) {
      return response.status(400).json({ error: "trip_id is required" });
    }

    // Verify trip access
    const hasAccess = await verifyTripAccess(trip_id, userId, supabase);
    if (!hasAccess) {
      return response
        .status(403)
        .json({ error: "Not authorized for this trip" });
    }

    // Build context
    const { context, error: contextError } = await buildTripContext({
      tripId: trip_id,
      userId,
      location,
      supabase,
    });

    if (contextError || !context) {
      return response
        .status(404)
        .json({ error: contextError || "Trip not found" });
    }

    // Get map intelligence
    const mapResponse = await getMapIntelligence({
      context,
      viewport,
    });

    return response.status(200).json(mapResponse);
  } catch (error: any) {
    console.error("[getMapAnnotations] Error:", error);
    return response.status(500).json({
      error: "Failed to get map annotations",
      details: error.message,
    });
  }
};

/**
 * PATCH /during-trip/activity/:activityId/status
 * Update activity progress status
 */
export const updateActivityStatus = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;
    const { activityId } = request.params;
    const { trip_id, status, notes } = request.body as IActivityStatusRequest;

    if (!trip_id) {
      return response.status(400).json({ error: "trip_id is required" });
    }

    if (!activityId) {
      return response.status(400).json({ error: "activityId is required" });
    }

    if (!status) {
      return response.status(400).json({ error: "status is required" });
    }

    const validStatuses = ["scheduled", "in_progress", "completed", "skipped"];
    if (!validStatuses.includes(status)) {
      return response.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Verify trip access
    const hasAccess = await verifyTripAccess(trip_id, userId, supabase);
    if (!hasAccess) {
      return response
        .status(403)
        .json({ error: "Not authorized for this trip" });
    }

    // Fetch current itinerary
    const { data: itineraryData, error: fetchError } = await supabase
      .from("trip_itineraries")
      .select("itinerary")
      .eq("trip_id", trip_id)
      .single();

    if (fetchError || !itineraryData) {
      return response.status(404).json({ error: "Itinerary not found" });
    }

    const itinerary = itineraryData.itinerary;

    // Find and update the activity in the itinerary JSONB
    let activityFound = false;
    const now = new Date().toISOString();

    for (const day of itinerary.days || []) {
      for (const activity of day.activities || []) {
        if (activity.id === activityId) {
          activityFound = true;

          // Update progress
          activity.progress = activity.progress || {};
          activity.progress.status = status;

          switch (status) {
            case "in_progress":
              activity.progress.started_at = now;
              break;
            case "completed":
              activity.progress.completed_at = now;
              break;
            case "skipped":
              activity.progress.skipped_at = now;
              break;
          }

          if (notes) {
            activity.progress.notes = notes;
          }

          break;
        }
      }
      if (activityFound) break;
    }

    if (!activityFound) {
      return response
        .status(404)
        .json({ error: "Activity not found in itinerary" });
    }

    // Save updated itinerary
    const { error: updateError } = await supabase
      .from("trip_itineraries")
      .update({ itinerary })
      .eq("trip_id", trip_id);

    if (updateError) {
      return response.status(500).json({
        error: "Failed to update activity status",
        details: updateError.message,
      });
    }

    return response.status(200).json({
      success: true,
      activity: {
        id: activityId,
        status: status,
        updated_at: now,
      },
    });
  } catch (error: any) {
    console.error("[updateActivityStatus] Error:", error);
    return response.status(500).json({
      error: "Failed to update activity status",
      details: error.message,
    });
  }
};
