import { Response } from "express";
import {
  IAuthenticatedRequest,
  IContextRequest,
  IDecideRequest,
  IFoodRequest,
  IMapIntelligenceRequest,
  IActivityStatusRequest,
  IAcceptSuggestionRequest,
  IAcceptSuggestionResponse,
} from "../types/interface.js";
import { supabase } from "../config.js";
import { buildTripContext } from "../utils/contextBuilder.js";
import { verifyTripAccess } from "../utils/verifyTripAccess.js";
import { runDecisionAgent } from "../utils/decisionAgent.js";
import { getFoodRecommendations } from "../utils/foodRecommendations.js";
import { getMapIntelligence } from "../utils/mapIntelligence.js";
import { convertSuggestionToActivity } from "../utils/convertSuggestionToActivity.js";
import { checkActivityConflicts } from "../utils/checkActivityConflicts.js";

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

/**
 * POST /during-trip/suggestions/accept
 * Accept a suggestion and add it to today's itinerary
 */
export const acceptSuggestion = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  try {
    const { id: userId } = request.user!;
    const {
      trip_id,
      suggestion,
      time_of_day,
      duration_minutes,
      override_conflicts,
      remove_conflicting_activity_ids,
    } = request.body as IAcceptSuggestionRequest;

    // Validation
    if (!trip_id) {
      return response.status(400).json({ error: "trip_id is required" });
    }

    if (!suggestion || !suggestion.id || !suggestion.title) {
      return response
        .status(400)
        .json({ error: "suggestion with id and title is required" });
    }

    if (!time_of_day || !["morning", "afternoon", "evening"].includes(time_of_day)) {
      return response
        .status(400)
        .json({ error: "time_of_day must be morning, afternoon, or evening" });
    }

    if (!duration_minutes || duration_minutes <= 0) {
      return response
        .status(400)
        .json({ error: "duration_minutes must be a positive number" });
    }

    // Verify trip access
    const hasAccess = await verifyTripAccess(trip_id, userId, supabase);
    if (!hasAccess) {
      return response
        .status(403)
        .json({ error: "Not authorized for this trip" });
    }

    // Build context to get current day number
    const { context, error: contextError } = await buildTripContext({
      tripId: trip_id,
      userId,
      supabase,
    });

    if (contextError || !context) {
      return response
        .status(404)
        .json({ error: contextError || "Trip not found" });
    }

    const currentDayNumber = context.trip.day_number;

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

    // Find today's day
    const today = itinerary.days?.find(
      (d: any) => d.day_number === currentDayNumber
    );

    if (!today) {
      return response.status(404).json({
        error: `Day ${currentDayNumber} not found in itinerary`,
      });
    }

    // Convert suggestion to activity
    const newActivity = convertSuggestionToActivity({
      trip_id,
      suggestion,
      time_of_day,
      duration_minutes,
    } as IAcceptSuggestionRequest);

    // Check for conflicts
    const conflictCheck = await checkActivityConflicts(today, newActivity);

    // If conflicts exist and not overridden, return conflict details
    if (conflictCheck.hasConflicts && !override_conflicts) {
      const responseData: IAcceptSuggestionResponse = {
        success: false,
        activity: {
          id: newActivity.id,
          name: newActivity.name,
          time_of_day,
          duration_minutes,
        },
        conflicts_detected: true,
        conflicts: conflictCheck.conflicts.map((conflict) => ({
          type: conflict.type,
          time_of_day: conflict.time_of_day,
          description: conflict.description,
          conflicting_activities: conflict.conflicting_activities,
        })),
      };

      return response.status(409).json(responseData); // 409 Conflict
    }

    // Remove conflicting activities if requested
    const removedActivities: Array<{ id: string; name: string }> = [];
    if (remove_conflicting_activity_ids && remove_conflicting_activity_ids.length > 0) {
      for (const activityId of remove_conflicting_activity_ids) {
        const activityIndex = today.activities.findIndex(
          (a: any) => a.id === activityId
        );
        if (activityIndex !== -1) {
          const removed = today.activities.splice(activityIndex, 1)[0];
          removedActivities.push({
            id: removed.id,
            name: removed.name || removed.title || "Unknown Activity",
          });
        }
      }
    }

    // Add the new activity to today's activities
    today.activities.push(newActivity);

    // Save updated itinerary
    const { error: updateError } = await supabase
      .from("trip_itineraries")
      .update({ itinerary })
      .eq("trip_id", trip_id);

    if (updateError) {
      return response.status(500).json({
        error: "Failed to update itinerary",
        details: updateError.message,
      });
    }

    // Return success response
    const responseData: IAcceptSuggestionResponse = {
      success: true,
      activity: {
        id: newActivity.id,
        name: newActivity.name,
        time_of_day,
        duration_minutes,
      },
      conflicts_detected: conflictCheck.hasConflicts,
      conflicts_resolved: conflictCheck.hasConflicts && (override_conflicts || removedActivities.length > 0),
    };

    if (removedActivities.length > 0) {
      responseData.removed_activities = removedActivities;
    }

    if (conflictCheck.hasConflicts) {
      responseData.conflicts = conflictCheck.conflicts.map((conflict) => ({
        type: conflict.type,
        time_of_day: conflict.time_of_day,
        description: conflict.description,
        conflicting_activities: conflict.conflicting_activities,
      }));
    }

    return response.status(200).json(responseData);
  } catch (error: any) {
    console.error("[acceptSuggestion] Error:", error);
    return response.status(500).json({
      error: "Failed to accept suggestion",
      details: error.message,
    });
  }
};
