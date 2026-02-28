import { Response } from "express";
import { IAuthenticatedRequest } from "../types/interface.js";
import { supabase } from "../config.js";
import { aiItineraryBuilderAgent } from "../utils/aiItineraryBuilderAgent.js";
import { enrichItineraryWithCosts } from "../utils/costEnrichment.js";
import { searchAndRankFlights } from "../utils/amadeusService.js";
import {
  computeActivityCentroid,
  rankHotels,
  generateReason,
  buildHotelPayload,
} from "../utils/hotelRecommendation.js";

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
    const aiStart = Date.now();
    const itinerary = await aiItineraryBuilderAgent(
      { trip, tripIdeas: filteredIdeas },
      (...args) => console.log(...args),
    );
    console.log(
      `${LOG_PREFIX} AI builder done in ${((Date.now() - aiStart) / 1000).toFixed(1)}s; enriching with costs + searching flights...`,
    );

    // Enrich with cost estimates AND search flights in parallel
    const tripDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const parallelStart = Date.now();
    const [enrichedItinerary, flightResult] = await Promise.all([
      enrichItineraryWithCosts(itinerary, trip.destination, tripDays).catch(
        (err: any) => {
          console.warn(
            `${LOG_PREFIX} Cost enrichment failed, saving without costs:`,
            err.message,
          );
          return itinerary;
        },
      ),
      (async () => {
        const { data: creatorProfile } = await supabase
          .from("member_profiles")
          .select("hometown")
          .eq("user_id", userId)
          .single();

        if (!creatorProfile?.hometown) {
          console.log(`${LOG_PREFIX} No hometown set, skipping flight search`);
          return null;
        }

        console.log(
          `${LOG_PREFIX} Searching flights: ${creatorProfile.hometown} → ${trip.destination} (${trip.start_date} → ${trip.end_date})`,
        );
        return searchAndRankFlights({
          originCity: creatorProfile.hometown,
          destinationCity: trip.destination,
          departureDate: trip.start_date.split("T")[0],
          returnDate: trip.end_date.split("T")[0],
          tripContext: {
            firstDayActivities:
              itinerary.days[0]?.activities?.map(
                (a: any) => a.name || a.title,
              ) || [],
            lastDayActivities:
              itinerary.days[itinerary.days.length - 1]?.activities?.map(
                (a: any) => a.name || a.title,
              ) || [],
          },
        });
      })().catch((err: any) => {
        console.warn(`${LOG_PREFIX} Flight search failed:`, err.message);
        return null;
      }),
    ]);
    console.log(
      `${LOG_PREFIX} Parallel enrichment done in ${((Date.now() - parallelStart) / 1000).toFixed(1)}s`,
    );

    // Attach flights if found
    if (flightResult) {
      enrichedItinerary.flights = flightResult;
      if (enrichedItinerary.budget) {
        const outboundPrice =
          flightResult.outbound[flightResult.selectedOutbound]?.priceTotal || 0;
        const returnPrice =
          flightResult.return[flightResult.selectedReturn]?.priceTotal || 0;
        enrichedItinerary.budget.flights = outboundPrice + returnPrice;
        enrichedItinerary.budget.total =
          enrichedItinerary.budget.activities +
          enrichedItinerary.budget.food +
          enrichedItinerary.budget.transport +
          enrichedItinerary.budget.flights +
          enrichedItinerary.budget.hotel;
      }
      console.log(
        `${LOG_PREFIX} Flight search complete, attached to itinerary`,
      );
    }

    // ── Hotel recommendation ──────────────────────────────────────────────────
    // 2.1 Query hotel ideas (category='stay', enrichment_status='DONE')
    try {
      const { data: hotelIdeas } = await supabase
        .from("trip_reel_ideas")
        .select()
        .eq("trip_id", tripId)
        .eq("category", "stay")
        .eq("enrichment_status", "DONE");

      if (!hotelIdeas || hotelIdeas.length === 0) {
        console.log(
          `${LOG_PREFIX} No hotel ideas found, skipping hotel recommendation`,
        );
        enrichedItinerary.hotel = null;
      } else {
        // 2.2 Compute activity centroid from generated itinerary days
        const centroid = computeActivityCentroid(enrichedItinerary.days ?? []);

        // 2.3 Rank hotels and pick winner
        const scoredHotels = rankHotels(hotelIdeas, centroid);
        const winner = scoredHotels[0];

        // 2.4 Derive isTopRated / isClosest flags
        const topRatedId = hotelIdeas.reduce((best: any, h: any) => {
          const r = h.place?.rating ?? h.rating ?? 0;
          const bestR = best?.place?.rating ?? best?.rating ?? 0;
          return r > bestR ? h : best;
        }, hotelIdeas[0])?.id;

        const closestHotel = centroid
          ? scoredHotels.reduce((closest, sh) =>
              (sh.distanceKm ?? Infinity) < (closest.distanceKm ?? Infinity)
                ? sh
                : closest,
            )
          : null;

        const isTopRated = winner.idea.id === topRatedId;
        const isClosest =
          closestHotel != null && winner.idea.id === closestHotel.idea.id;

        const reason = generateReason(winner.idea, isTopRated, isClosest);

        // 2.5 Attach hotel payload
        enrichedItinerary.hotel = buildHotelPayload(winner.idea, reason);
        console.log(
          `${LOG_PREFIX} Hotel selected: "${enrichedItinerary.hotel.name}" (score: ${winner.score.toFixed(3)}, reason: "${reason}")`,
        );

        // 2.6 Update budget.hotel if nightlyRate is available
        const nightlyRate = enrichedItinerary.hotel.nightlyRate;
        if (nightlyRate != null && tripDays > 0 && enrichedItinerary.budget) {
          enrichedItinerary.budget.hotel = nightlyRate * tripDays;
          enrichedItinerary.budget.total =
            (enrichedItinerary.budget.activities ?? 0) +
            (enrichedItinerary.budget.food ?? 0) +
            (enrichedItinerary.budget.transport ?? 0) +
            (enrichedItinerary.budget.flights ?? 0) +
            enrichedItinerary.budget.hotel;
          console.log(
            `${LOG_PREFIX} Budget hotel: $${nightlyRate} × ${tripDays} days = $${enrichedItinerary.budget.hotel}`,
          );
        }
      }
    } catch (hotelErr: any) {
      console.warn(
        `${LOG_PREFIX} Hotel recommendation failed, continuing without hotel:`,
        hotelErr.message,
      );
      enrichedItinerary.hotel = null;
    }
    // ─────────────────────────────────────────────────────────────────────────

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

export const selectFlight = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { id: tripId } = request.params;
  const { direction, selectedIndex } = request.body;
  console.log(
    `${LOG_PREFIX} PATCH /itinerary/${tripId}/flights/select (direction: ${direction}, index: ${selectedIndex})`,
  );

  try {
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

    const itinerary = (row.itinerary as any)?.itinerary ?? row.itinerary;
    if (!itinerary.flights) {
      return response
        .status(400)
        .json({ error: "No flights in this itinerary" });
    }

    // Update selected index
    if (direction === "outbound") {
      itinerary.flights.selectedOutbound = selectedIndex;
    } else {
      itinerary.flights.selectedReturn = selectedIndex;
    }

    // Recalculate budget.flights
    const outPrice =
      itinerary.flights.outbound[itinerary.flights.selectedOutbound]
        ?.priceTotal || 0;
    const retPrice =
      itinerary.flights.return[itinerary.flights.selectedReturn]?.priceTotal ||
      0;
    if (itinerary.budget) {
      itinerary.budget.flights = outPrice + retPrice;
      itinerary.budget.total =
        itinerary.budget.activities +
        itinerary.budget.food +
        itinerary.budget.transport +
        itinerary.budget.flights +
        itinerary.budget.hotel;
    }

    // Save back — preserve the original wrapper shape
    const toSave = (row.itinerary as any)?.itinerary
      ? { ...(row.itinerary as any), itinerary }
      : itinerary;

    const { error: saveError } = await supabase
      .from("trip_itineraries")
      .update({ itinerary: toSave })
      .eq("id", row.id);

    if (saveError) {
      return response.status(500).json({ error: saveError.message });
    }

    console.log(`${LOG_PREFIX} Flight selection updated for trip ${tripId}`);
    return response.json({ success: true });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Select flight error:`, error);
    return response.status(500).json({ error: error.message });
  }
};

export const regenerateFlights = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { id: tripId } = request.params;
  const userId = request.user?.id;
  console.log(`${LOG_PREFIX} POST /itinerary/${tripId}/flights/regenerate`);

  try {
    // Fetch trip details
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("destination, start_date, end_date")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return response.status(404).json({ error: "Trip not found" });
    }

    // Fetch existing itinerary row
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

    const itinerary = (row.itinerary as any)?.itinerary ?? row.itinerary;

    // Get user's hometown
    const { data: creatorProfile } = await supabase
      .from("member_profiles")
      .select("hometown")
      .eq("user_id", userId)
      .single();

    if (!creatorProfile?.hometown) {
      return response.status(400).json({ error: "No hometown set on profile" });
    }

    console.log(
      `${LOG_PREFIX} Regenerating flights: ${creatorProfile.hometown} → ${trip.destination}`,
    );

    const flightResult = await searchAndRankFlights({
      originCity: creatorProfile.hometown,
      destinationCity: trip.destination,
      departureDate: trip.start_date.split("T")[0],
      returnDate: trip.end_date.split("T")[0],
      tripContext: {
        firstDayActivities:
          itinerary.days?.[0]?.activities?.map((a: any) => a.name || a.title) ||
          [],
        lastDayActivities:
          itinerary.days?.[itinerary.days.length - 1]?.activities?.map(
            (a: any) => a.name || a.title,
          ) || [],
      },
    });

    if (!flightResult) {
      return response
        .status(502)
        .json({ error: "Flight search returned no results" });
    }

    itinerary.flights = flightResult;
    if (itinerary.budget) {
      const outPrice =
        flightResult.outbound[flightResult.selectedOutbound]?.priceTotal || 0;
      const retPrice =
        flightResult.return[flightResult.selectedReturn]?.priceTotal || 0;
      itinerary.budget.flights = outPrice + retPrice;
      itinerary.budget.total =
        itinerary.budget.activities +
        itinerary.budget.food +
        itinerary.budget.transport +
        itinerary.budget.flights +
        itinerary.budget.hotel;
    }

    const toSave = (row.itinerary as any)?.itinerary
      ? { ...(row.itinerary as any), itinerary }
      : itinerary;

    const { error: saveError } = await supabase
      .from("trip_itineraries")
      .update({ itinerary: toSave })
      .eq("id", row.id);

    if (saveError) {
      return response.status(500).json({ error: saveError.message });
    }

    console.log(`${LOG_PREFIX} Flights regenerated for trip ${tripId}`);
    return response.json({ success: true, flights: flightResult });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Regenerate flights error:`, error);
    return response.status(500).json({ error: error.message });
  }
};
