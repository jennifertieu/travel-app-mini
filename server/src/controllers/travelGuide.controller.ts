import { Response } from "express";
import { IAuthenticatedRequest } from "../types/interface.js";
import { supabase } from "../config.js";
import {
  generateDestinationGuide,
  generateActivitySpotlights,
} from "../utils/travelGuideService.js";

const LOG = "[TravelGuide]";

export const getOrCreateDestinationGuide = async (
  req: IAuthenticatedRequest,
  res: Response,
) => {
  const { tripId } = req.params;
  console.log(`${LOG} GET destination guide for trip ${tripId}`);

  try {
    // Check cache
    const { data: existing, error: cacheErr } = await supabase
      .from("trip_travel_guides")
      .select("guide_data")
      .eq("trip_id", tripId)
      .eq("guide_type", "destination")
      .maybeSingle();

    if (cacheErr) console.error(`${LOG} Cache lookup error:`, cacheErr.message);

    if (existing?.guide_data) {
      console.log(`${LOG} [destination] Cache HIT — returning cached guide`);
      return res.status(200).json({ guide_data: existing.guide_data });
    }
    console.log(`${LOG} [destination] Cache MISS — generating...`);

    // Get trip destination
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("destination")
      .eq("id", tripId)
      .single();

    if (tripError || !trip?.destination) {
      console.error(`${LOG} [destination] Trip not found:`, tripError?.message);
      return res.status(404).json({ error: "Trip not found" });
    }
    console.log(`${LOG} [destination] Destination: ${trip.destination}`);

    const guide = await generateDestinationGuide(trip.destination);
    console.log(
      `${LOG} [destination] Generated ${guide.sections?.length ?? 0} sections`,
    );

    await supabase.from("trip_travel_guides").upsert(
      {
        trip_id: tripId,
        guide_type: "destination",
        guide_data: guide,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "trip_id,guide_type" },
    );
    console.log(`${LOG} [destination] Saved to cache`);

    return res.status(200).json({ guide_data: guide });
  } catch (err: any) {
    console.error(`${LOG} [destination] Error:`, err.message);
    return res
      .status(500)
      .json({ error: "Failed to generate travel guide", details: err.message });
  }
};

export const getOrCreateSpotlightsGuide = async (
  req: IAuthenticatedRequest,
  res: Response,
) => {
  const { tripId } = req.params;
  console.log(`${LOG} GET spotlights guide for trip ${tripId}`);

  try {
    // Check cache
    const { data: existing, error: cacheErr } = await supabase
      .from("trip_travel_guides")
      .select("guide_data")
      .eq("trip_id", tripId)
      .eq("guide_type", "spotlights")
      .maybeSingle();

    if (cacheErr) console.error(`${LOG} Cache lookup error:`, cacheErr.message);

    // Don't serve cached empty spotlights
    const existingSpotlights = existing?.guide_data as any;
    if (existingSpotlights && Array.isArray(existingSpotlights.spotlights)) {
      if (existingSpotlights.spotlights.length > 0) {
        console.log(
          `${LOG} [spotlights] Cache HIT — returning ${existingSpotlights.spotlights.length} spotlights`,
        );
        return res.status(200).json({ guide_data: existing!.guide_data });
      } else {
        console.warn(
          `${LOG} [spotlights] Cache HIT but empty spotlights array — regenerating`,
        );
      }
    } else {
      console.log(`${LOG} [spotlights] Cache MISS — generating...`);
    }

    // Get trip + itinerary
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("destination")
      .eq("id", tripId)
      .single();

    if (!trip?.destination) {
      console.error(`${LOG} [spotlights] Trip not found:`, tripErr?.message);
      return res.status(404).json({ error: "Trip not found" });
    }
    console.log(`${LOG} [spotlights] Destination: ${trip.destination}`);

    const { data: itineraryRow, error: itinErr } = await supabase
      .from("trip_itineraries")
      .select("itinerary")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!itineraryRow?.itinerary) {
      console.error(
        `${LOG} [spotlights] Itinerary not found:`,
        itinErr?.message,
      );
      return res.status(404).json({ error: "Itinerary not found" });
    }

    const raw = itineraryRow.itinerary as Record<string, unknown>;
    const inner = (raw.itinerary ?? raw) as Record<string, unknown>;
    const days = inner.days as Array<{ activities: any[] }> | undefined;

    console.log(
      `${LOG} [spotlights] Itinerary structure — days: ${Array.isArray(days) ? days.length : "NOT ARRAY"}`,
    );

    if (!Array.isArray(days)) {
      console.error(
        `${LOG} [spotlights] Invalid itinerary structure:`,
        JSON.stringify(Object.keys(raw)),
      );
      return res.status(400).json({ error: "Invalid itinerary structure" });
    }

    const activities = days.flatMap((d) => d.activities ?? []);
    console.log(
      `${LOG} [spotlights] Found ${activities.length} activities across ${days.length} days`,
    );

    if (activities.length === 0) {
      console.error(`${LOG} [spotlights] No activities found`);
      return res
        .status(400)
        .json({ error: "No activities found in itinerary" });
    }

    console.log(
      `${LOG} [spotlights] Calling OpenAI for ${Math.min(activities.length, 10)} activities...`,
    );
    const guide = await generateActivitySpotlights(
      trip.destination,
      activities,
    );
    console.log(
      `${LOG} [spotlights] Generated ${guide.spotlights?.length ?? 0} spotlights`,
    );

    // Don't cache empty results
    if (!guide.spotlights || guide.spotlights.length === 0) {
      console.warn(
        `${LOG} [spotlights] OpenAI returned empty spotlights — not caching`,
      );
      return res.status(200).json({ guide_data: guide });
    }

    await supabase.from("trip_travel_guides").upsert(
      {
        trip_id: tripId,
        guide_type: "spotlights",
        guide_data: guide,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "trip_id,guide_type" },
    );
    console.log(`${LOG} [spotlights] Saved to cache`);

    return res.status(200).json({ guide_data: guide });
  } catch (err: any) {
    console.error(`${LOG} [spotlights] Error:`, err.message);
    return res
      .status(500)
      .json({ error: "Failed to generate spotlights", details: err.message });
  }
};

export const regenerateGuide = async (
  req: IAuthenticatedRequest,
  res: Response,
) => {
  const { tripId, guideType } = req.params;

  await supabase
    .from("trip_travel_guides")
    .delete()
    .eq("trip_id", tripId)
    .eq("guide_type", guideType);

  // Re-use the appropriate handler
  if (guideType === "destination") {
    return getOrCreateDestinationGuide(req, res);
  }
  return getOrCreateSpotlightsGuide(req, res);
};
