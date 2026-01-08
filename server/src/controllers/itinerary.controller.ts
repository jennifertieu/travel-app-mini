import { Response } from "express";
import { IAuthenticatedRequest } from "../types/interface.js";
import { supabase } from "../config.js";
import { aiItineraryBuilderAgent } from "../utils/aiItineraryBuilderAgent.js";

export const createItinerary = async (
  request: IAuthenticatedRequest,
  response: Response
) => {
  const { id: tripId } = request.params;

  try {
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select()
      .eq("id", tripId)
      .single();

    if (tripError) {
      return response.status(404).json({ error: tripError.message });
    }

    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);

    if (startDate >= endDate) {
      return response
        .status(400)
        .json({ error: "Trip start_date must be before end_date" });
    }

    const { data: tripIdeas, error: ideaError } = await supabase
      .from("trip_reel_ideas")
      .select()
      .eq("trip_id", tripId)
      .eq("enrichment_status", "finished")
      .in("preference", ["fire", "down"]);

    if (ideaError) {
      return response.status(400).json({ error: ideaError.message });
    }

    const itinerary = await aiItineraryBuilderAgent({
      trip,
      tripIdeas,
    });

    const { error: saveItineraryError } = await supabase
      .from("trip_itineraries")
      .upsert({
        trip_id: trip.id,
        itinerary_data: itinerary,
      });

    if (saveItineraryError) {
      return response.status(500).json({
        error: "Failed to save itinerary",
        details: saveItineraryError.message,
      });
    }

    return response.json({
      success: true,
      tripId: trip.id,
      activitiesCount: tripIdeas.length,
    });
  } catch (error: any) {
    console.error("Itinerary creation error:", error);
    return response.status(500).json({
      error: "Failed to generate itinerary",
      details: error.message,
    });
  }
};
