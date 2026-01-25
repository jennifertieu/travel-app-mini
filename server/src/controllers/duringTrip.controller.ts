import { Response } from "express";
import {
  IAuthenticatedRequest,
  IAcceptSuggestionRequest,
  IAcceptSuggestionResponse,
} from "../types/interface.js";
import { supabase } from "../config.js";
import { buildTripContext } from "../utils/contextBuilder.js";
import { runDecisionAgent } from "../utils/decisionAgent.js";
import { getFoodRecommendations } from "../utils/foodRecommendations.js";
import { getMapIntelligence } from "../utils/mapIntelligence.js";
import { convertSuggestionToActivity } from "../utils/convertSuggestionToActivity.js";
import { checkActivityConflicts } from "../utils/checkActivityConflicts.js";
import {
  contextRequestSchema,
  decideRequestSchema,
  foodRequestSchema,
  mapIntelligenceRequestSchema,
  activityStatusRequestSchema,
  acceptSuggestionRequestSchema,
  validateRequest,
} from "../utils/validationSchemas.js";

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
    
    // Validate request body
    const validation = validateRequest(contextRequestSchema, request.body);
    if (!validation.success) {
      return response.status(400).json({ error: validation.error });
    }
    
    const { trip_id, location } = validation.data;

    // Trip access verified by requireTripAccess middleware

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[getContext] Error:", errorMessage);
    return response.status(500).json({
      error: "Failed to get context",
      details: errorMessage,
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
    
    // Validate request body
    const validation = validateRequest(decideRequestSchema, request.body);
    if (!validation.success) {
      return response.status(400).json({ error: validation.error });
    }
    
    const { trip_id, location } = validation.data;

    // Trip access verified by requireTripAccess middleware

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[getDecision] Error:", errorMessage);
    return response.status(500).json({
      error: "Failed to get decision suggestions",
      details: errorMessage,
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
    
    // Validate request body
    const validation = validateRequest(foodRequestSchema, request.body);
    if (!validation.success) {
      return response.status(400).json({ error: validation.error });
    }
    
    const { trip_id, location } = validation.data;

    // Trip access verified by requireTripAccess middleware

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[getFood] Error:", errorMessage);
    return response.status(500).json({
      error: "Failed to get food recommendations",
      details: errorMessage,
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
    
    // Validate request body
    const validation = validateRequest(mapIntelligenceRequestSchema, request.body);
    if (!validation.success) {
      return response.status(400).json({ error: validation.error });
    }
    
    const { trip_id, location, viewport } = validation.data;

    // Trip access verified by requireTripAccess middleware

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[getMapAnnotations] Error:", errorMessage);
    return response.status(500).json({
      error: "Failed to get map annotations",
      details: errorMessage,
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
    
    if (!activityId) {
      return response.status(400).json({ error: "activityId is required" });
    }
    
    // Validate request body
    const validation = validateRequest(activityStatusRequestSchema, request.body);
    if (!validation.success) {
      return response.status(400).json({ error: validation.error });
    }
    
    const { trip_id, status, notes } = validation.data;

    // Trip access verified by requireTripAccess middleware

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
    // NOTE: This update pattern has a race condition risk if multiple requests
    // update the same itinerary simultaneously. For production, consider:
    // 1. Using PostgreSQL RPC function with jsonb_set for atomic updates
    // 2. Adding optimistic locking with updated_at timestamp check
    // 3. Using PostgreSQL transactions via RPC
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[updateActivityStatus] Error:", errorMessage);
    return response.status(500).json({
      error: "Failed to update activity status",
      details: errorMessage,
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
    
    // Validate request body
    const validation = validateRequest(acceptSuggestionRequestSchema, request.body);
    if (!validation.success) {
      return response.status(400).json({ error: validation.error });
    }
    
    const {
      trip_id,
      suggestion,
      time_of_day,
      duration_minutes,
      override_conflicts,
      remove_conflicting_activity_ids,
    } = validation.data;

    // Trip access verified by requireTripAccess middleware

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
      (d: { day_number: number }) => d.day_number === currentDayNumber
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
          (a: { id: string }) => a.id === activityId
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
    // NOTE: This update pattern has a race condition risk if multiple requests
    // update the same itinerary simultaneously. For production, consider:
    // 1. Using PostgreSQL RPC function with jsonb_set for atomic updates
    // 2. Adding optimistic locking with updated_at timestamp check
    // 3. Using PostgreSQL transactions via RPC
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[acceptSuggestion] Error:", errorMessage);
    return response.status(500).json({
      error: "Failed to accept suggestion",
      details: errorMessage,
    });
  }
};
