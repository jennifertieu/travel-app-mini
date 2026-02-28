import { Response } from "express";
import { IAuthenticatedRequest } from "../types/interface.js";
import { supabase } from "../config.js";
import { aiItineraryBuilderAgent } from "../utils/aiItineraryBuilderAgent.js";
import { enrichItineraryWithCosts } from "../utils/costEnrichment.js";

const LOG_PREFIX = "[itinerary]";

export const createItinerary = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { id: tripId } = request.params;
  const userId = request.user?.id;

  console.log(
    `${LOG_PREFIX} POST /itinerary/${tripId} (user: ${userId ?? "unknown"})`,
  );

  try {
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select()
      .eq("id", tripId)
      .single();

    if (tripError) {
      console.log(`${LOG_PREFIX} Trip not found: ${tripId}`, tripError.message);
      return response.status(404).json({ error: tripError.message });
    }
    console.log(
      `${LOG_PREFIX} Trip found: ${trip.destination ?? trip.id}, dates: ${trip.start_date} → ${trip.end_date}`,
    );

    if (!trip.start_date || !trip.end_date) {
      console.log(`${LOG_PREFIX} Rejected: missing start_date or end_date`);
      return response
        .status(400)
        .json({ error: "Trip must have both start_date and end_date" });
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
      .eq("enrichment_status", "DONE");

    if (ideaError) {
      console.log(`${LOG_PREFIX} Ideas fetch error:`, ideaError.message);
      return response.status(400).json({ error: ideaError.message });
    }
    console.log(
      `${LOG_PREFIX} Ideas: ${tripIdeas?.length ?? 0} (enrichment_status=DONE)`,
    );

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

    // Check if we have any ideas left after filtering
    if (filteredIdeas.length === 0) {
      console.log(
        `${LOG_PREFIX} Rejected: no ideas passed vote filter (had ${tripIdeas.length} total)`,
      );
      return response.status(400).json({
        error: "No suitable ideas found for itinerary generation",
        details:
          "All ideas were filtered out due to negative voting or lack of positive votes",
      });
    }
    console.log(
      `${LOG_PREFIX} After filter: ${filteredIdeas.length} ideas (from ${tripIdeas.length})`,
    );

    // Sort by fire votes, then down votes
    filteredIdeas.sort((ideaA, ideaB) => {
      const countsA = reactionCounts[ideaA.id];
      const countsB = reactionCounts[ideaB.id];
      if (countsB.fire !== countsA.fire) return countsB.fire - countsA.fire;
      return countsB.down - countsA.down;
    });

    // Pass filtered, ranked ideas to AI agent
    console.log(`${LOG_PREFIX} Calling AI itinerary builder...`);
    const itinerary = await aiItineraryBuilderAgent({
      trip,
      tripIdeas: filteredIdeas,
    });
    console.log(`${LOG_PREFIX} AI builder returned; enriching with costs...`);

    // Enrich with cost estimates (failure won't block save)
    const tripDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    let enrichedItinerary = itinerary;
    try {
      enrichedItinerary = await enrichItineraryWithCosts(
        itinerary,
        trip.destination,
        tripDays,
      );
      console.log(`${LOG_PREFIX} Cost enrichment complete`);
    } catch (costError: any) {
      console.warn(
        `${LOG_PREFIX} Cost enrichment failed, saving without costs:`,
        costError.message,
      );
    }

    const { error: saveItineraryError } = await supabase
      .from("trip_itineraries")
      .upsert({
        trip_id: trip.id,
        itinerary: enrichedItinerary,
      });

    if (saveItineraryError) {
      console.log(`${LOG_PREFIX} Save error:`, saveItineraryError.message);
      return response.status(500).json({
        error: "Failed to save itinerary",
        details: saveItineraryError.message,
      });
    }

    console.log(`${LOG_PREFIX} Success: itinerary saved for trip ${trip.id}`);
    return response.json({
      success: true,
      tripId: trip.id,
      activitiesCount: filteredIdeas.length,
    });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Itinerary creation error:`, error);
    return response.status(500).json({
      error: "Failed to generate itinerary",
      details: error.message,
    });
  }
};

export const recalculateBudget = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { id: tripId } = request.params;
  console.log(`${LOG_PREFIX} POST /itinerary/${tripId}/recalculate-budget`);

  try {
    // Fetch existing itinerary
    const { data: row, error: fetchError } = await supabase
      .from("trip_itineraries")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !row) {
      return response.status(404).json({ error: "Itinerary not found" });
    }

    // Fetch trip for destination
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("destination, start_date, end_date")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return response.status(404).json({ error: "Trip not found" });
    }

    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    const tripDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Parse itinerary — handle nested shape
    const rawItinerary = row.itinerary as any;
    const itinerary = rawItinerary?.itinerary ?? rawItinerary;

    const enriched = await enrichItineraryWithCosts(
      itinerary,
      trip.destination,
      tripDays,
    );

    // Save back — preserve the original wrapper shape
    const toSave = rawItinerary?.itinerary
      ? { ...rawItinerary, itinerary: enriched }
      : enriched;

    const { error: saveError } = await supabase
      .from("trip_itineraries")
      .update({ itinerary: toSave })
      .eq("id", row.id);

    if (saveError) {
      return response.status(500).json({ error: saveError.message });
    }

    console.log(`${LOG_PREFIX} Budget recalculated for trip ${tripId}`);
    return response.json({ success: true });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Recalculate budget error:`, error);
    return response.status(500).json({ error: error.message });
  }
};
