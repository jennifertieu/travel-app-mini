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

    // Fetch all trip ideas for this trip
    // New logic: fetch all ideas, then fetch and aggregate reactions, filter out ideas with high meh/skip, and rank by fire/down votes
    const { data: tripIdeas, error: ideaError } = await supabase
      .from("trip_reel_ideas")
      .select()
      .eq("trip_id", tripId)
      .eq("enrichment_status", "finished");

    if (ideaError) {
      return response.status(400).json({ error: ideaError.message });
    }

    // Fetch all reactions for these ideas
    const ideaIds = tripIdeas.map((idea) => idea.id);
    const { data: reactions, error: reactionsError } = await supabase
      .from("trip_reel_idea_reactions")
      .select()
      .in("idea_id", ideaIds);

    if (reactionsError) {
      return response.status(400).json({ error: reactionsError.message });
    }

    // Aggregate reactions per idea
    const reactionCounts: Record<
      string,
      { fire: number; down: number; meh: number; skip: number }
    > = {};
    for (const ideaId of ideaIds) {
      reactionCounts[ideaId] = { fire: 0, down: 0, meh: 0, skip: 0 };
    }
    for (const reaction of reactions) {
      if (reactionCounts[reaction.idea_id]) {
        switch (reaction.signal) {
          case "fire":
            reactionCounts[reaction.idea_id].fire++;
            break;
          case "down":
            reactionCounts[reaction.idea_id].down++;
            break;
          case "meh":
            reactionCounts[reaction.idea_id].meh++;
            break;
          case "skip":
            reactionCounts[reaction.idea_id].skip++;
            break;
          default:
            break;
        }
      }
    }

    // Filter out ideas with high meh/skip votes (threshold: more meh+skip than fire+down)
    const filteredIdeas = tripIdeas.filter((idea) => {
      const counts = reactionCounts[idea.id];
      const positiveVotes = counts.fire + counts.down;
      const negativeVotes = counts.meh + counts.skip;
      const hasPositiveSupport = positiveVotes > 0;
      const isMorePositiveThanNegative = positiveVotes > negativeVotes;

      return hasPositiveSupport && isMorePositiveThanNegative;
    });

    // Sort by fire votes, then down votes
    filteredIdeas.sort((ideaA, ideaB) => {
      const countsA = reactionCounts[ideaA.id];
      const countsB = reactionCounts[ideaB.id];
      if (countsB.fire !== countsA.fire) return countsB.fire - countsA.fire;
      return countsB.down - countsA.down;
    });

    // Pass filtered, ranked ideas to AI agent
    const itinerary = await aiItineraryBuilderAgent({
      trip,
      tripIdeas: filteredIdeas,
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
