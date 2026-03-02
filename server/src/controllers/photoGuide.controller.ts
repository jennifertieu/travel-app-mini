import { Response } from "express";
import { IAuthenticatedRequest } from "../types/interface.js";
import { supabase } from "../config.js";
import {
  generatePhotoGuideWithAI,
  IPhotoGuideData,
  IPhotoTip,
} from "../utils/generatePhotoGuide.js";
import { generateSelfieImage } from "../utils/generateSelfieImage.js";

const LOG_PREFIX = "[photo-guide]";

/** Returns the first/primary image URL for an activity (for selfie generation). */
function getActivityImageUrl(activity: any): string | undefined {
  const urls = getActivityImageUrls(activity);
  return urls.length > 0 ? urls[0] : undefined;
}

/** Returns all place photo URLs for an activity (Google Places photos + activity.image_url). */
function getActivityImageUrls(activity: any): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (url: string | undefined) => {
    if (typeof url === "string" && url.trim() && !seen.has(url)) {
      seen.add(url);
      out.push(url.trim());
    }
  };
  if (activity.image_url) add(activity.image_url);
  const place = activity.place;
  if (place?.photoUrl) add(place.photoUrl);
  const photos = place?.photos;
  if (Array.isArray(photos)) {
    for (const p of photos) {
      if (typeof p === "string") add(p);
    }
  }
  return out;
}

function getActivityName(activity: any): string {
  return activity.title || activity.name || "Activity";
}

/** Builds guide data for one day (tips + images + pre-generated selfies). Does not read/write DB. */
async function buildGuideForDay(
  destination: string,
  day: { day_number?: number; day?: number; activities: any[] },
  nameToImage: Record<string, string>,
  nameToImageUrls: Record<string, string[]>,
): Promise<IPhotoGuideData> {
  const activitiesForPrompt = day.activities.map((a) => ({
    name: getActivityName(a),
    description: a.summary ?? a.description,
    time_of_day: a.time_of_day,
    category: a.category,
  }));
  const guideData = await generatePhotoGuideWithAI(
    destination,
    activitiesForPrompt,
  );
  let tipsWithImages: IPhotoTip[] = guideData.tips.map((tip) => {
    const imageUrl = nameToImage[tip.activity_name];
    const imageUrls = nameToImageUrls[tip.activity_name];
    return {
      ...tip,
      image_url: imageUrl,
      ...(imageUrls?.length ? { image_urls: imageUrls } : {}),
    };
  });
  for (let i = 0; i < tipsWithImages.length; i++) {
    const tip = tipsWithImages[i];
    const urls = tip.image_urls?.length
      ? tip.image_urls
      : tip.image_url
        ? [tip.image_url]
        : [];
    if (urls.length === 0) continue;
    try {
      const b64 = await generateSelfieImage(urls, {
        imagePrompt: tip.image_prompt,
        challengeDescription: tip.challenge?.description,
        poseIdea: tip.pose_idea,
      });
      tipsWithImages = tipsWithImages.map((t, j) =>
        j === i ? { ...t, generated_selfie_base64: b64 } : t,
      );
    } catch (err: any) {
      console.warn(
        `${LOG_PREFIX} Pre-generate failed for ${tip.activity_name}:`,
        err?.message ?? err,
      );
    }
  }
  return { pose_of_the_day: guideData.pose_of_the_day, tips: tipsWithImages };
}

export const getOrCreatePhotoGuide = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { tripId } = request.params;
  const { day_number: dayNumber } = request.body as { day_number?: number };

  if (typeof dayNumber !== "number" || dayNumber < 1) {
    return response.status(400).json({
      error: "day_number is required and must be a positive integer",
    });
  }

  console.log(`${LOG_PREFIX} POST /photo-guide/${tripId} day=${dayNumber}`);

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("trip_photo_guides")
      .select("guide_data")
      .eq("trip_id", tripId)
      .eq("day_number", dayNumber)
      .maybeSingle();

    if (fetchError) {
      console.error(`${LOG_PREFIX} Fetch error:`, fetchError.message);
      return response.status(500).json({ error: fetchError.message });
    }

    if (existing?.guide_data) {
      console.log(
        `${LOG_PREFIX} Returning cached guide for trip ${tripId} day ${dayNumber}`,
      );
      return response.status(200).json({ guide_data: existing.guide_data });
    }

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, destination")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return response.status(404).json({ error: "Trip not found" });
    }

    const { data: itineraryRow, error: itineraryError } = await supabase
      .from("trip_itineraries")
      .select("itinerary")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (itineraryError || !itineraryRow?.itinerary) {
      return response.status(404).json({
        error: "Itinerary not found. Build the trip itinerary first.",
      });
    }

    const raw = itineraryRow.itinerary as Record<string, unknown>;
    const inner = (raw.itinerary ?? raw) as Record<string, unknown>;
    const days = inner.days as
      | Array<{ day_number?: number; day?: number; activities: any[] }>
      | undefined;

    if (!Array.isArray(days)) {
      return response
        .status(400)
        .json({ error: "Invalid itinerary structure" });
    }

    const day = days.find((d) => (d.day_number ?? d.day) === dayNumber);
    if (!day?.activities?.length) {
      return response.status(404).json({
        error: `No activities found for day ${dayNumber}`,
      });
    }

    const nameToImage: Record<string, string> = {};
    const nameToImageUrls: Record<string, string[]> = {};
    for (const a of day.activities) {
      const name = getActivityName(a);
      const urls = getActivityImageUrls(a);
      if (urls.length > 0) {
        nameToImage[name] = urls[0];
        nameToImageUrls[name] = urls;
      }
    }

    const guideDataToStore = await buildGuideForDay(
      trip.destination,
      day,
      nameToImage,
      nameToImageUrls,
    );

    const { error: upsertError } = await supabase
      .from("trip_photo_guides")
      .upsert(
        {
          trip_id: tripId,
          day_number: dayNumber,
          guide_data: guideDataToStore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "trip_id,day_number" },
      );

    if (upsertError) {
      console.error(`${LOG_PREFIX} Upsert error:`, upsertError.message);
      return response.status(500).json({ error: "Failed to save photo guide" });
    }

    console.log(
      `${LOG_PREFIX} Generated and saved guide for trip ${tripId} day ${dayNumber}`,
    );
    return response.status(200).json({ guide_data: guideDataToStore });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Error:`, error);
    return response.status(500).json({
      error: "Failed to generate photo guide",
      details: error.message,
    });
  }
};

export const generateSelfie = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { tripId } = request.params;
  const {
    day_number: dayNumber,
    activity_name: activityName,
    regenerate,
  } = request.body as {
    day_number?: number;
    activity_name?: string;
    regenerate?: boolean;
  };

  if (typeof dayNumber !== "number" || dayNumber < 1 || !activityName?.trim()) {
    return response.status(400).json({
      error: "day_number and activity_name are required",
    });
  }

  console.log(
    `${LOG_PREFIX} POST generate-selfie trip=${tripId} day=${dayNumber} activity=${activityName}`,
  );

  try {
    const { data: row, error: fetchError } = await supabase
      .from("trip_photo_guides")
      .select("guide_data")
      .eq("trip_id", tripId)
      .eq("day_number", dayNumber)
      .maybeSingle();

    if (fetchError || !row?.guide_data) {
      return response.status(404).json({
        error:
          "Photo guide not found for this day. Generate the photo guide first.",
      });
    }

    const guide = row.guide_data as IPhotoGuideData;
    const activityKey = activityName.trim().toLowerCase();
    const tipIndex = guide.tips?.findIndex(
      (t) => t.activity_name?.toLowerCase() === activityKey,
    );
    const tip =
      tipIndex !== undefined && tipIndex >= 0
        ? guide.tips?.[tipIndex]
        : undefined;
    const urls = tip?.image_urls?.length
      ? tip.image_urls
      : tip?.image_url
        ? [tip.image_url]
        : [];
    if (!tip || !urls.length) {
      return response.status(400).json({
        error: "No place image available for this activity. Try another spot.",
      });
    }

    let imageBase64: string;
    const useCache = tip.generated_selfie_base64 && !regenerate;
    if (useCache) {
      console.log(`${LOG_PREFIX} Using cached selfie for ${activityName}`);
      imageBase64 = tip.generated_selfie_base64!;
    } else {
      console.log(
        `${LOG_PREFIX} Generating selfie for ${activityName}, image_prompt:`,
        tip.image_prompt ?? "(fallback to challenge/pose)",
      );
      imageBase64 = await generateSelfieImage(urls, {
        imagePrompt: tip.image_prompt,
        challengeDescription: tip.challenge?.description,
        poseIdea: tip.pose_idea,
      });
      const updatedTips = [...(guide.tips ?? [])];
      if (tipIndex !== undefined && tipIndex >= 0 && updatedTips[tipIndex]) {
        updatedTips[tipIndex] = {
          ...updatedTips[tipIndex],
          generated_selfie_base64: imageBase64,
        };
      }
      const updatedGuide: IPhotoGuideData = {
        ...guide,
        tips: updatedTips,
      };
      await supabase.from("trip_photo_guides").upsert(
        {
          trip_id: tripId,
          day_number: dayNumber,
          guide_data: updatedGuide,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "trip_id,day_number" },
      );
    }
    return response.status(200).json({ image_base64: imageBase64 });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} generateSelfie error:`, error);
    return response.status(500).json({
      error: "Failed to generate selfie image",
      details: error?.message,
    });
  }
};

export const generateAllPhotoGuides = async (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const { tripId } = request.params;

  console.log(`${LOG_PREFIX} POST generate-all trip=${tripId}`);

  try {
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("id, destination")
      .eq("id", tripId)
      .single();

    if (tripError || !trip) {
      return response.status(404).json({ error: "Trip not found" });
    }

    const { data: itineraryRow, error: itineraryError } = await supabase
      .from("trip_itineraries")
      .select("itinerary")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (itineraryError || !itineraryRow?.itinerary) {
      return response.status(404).json({
        error: "Itinerary not found. Build the trip itinerary first.",
      });
    }

    const raw = itineraryRow.itinerary as Record<string, unknown>;
    const inner = (raw.itinerary ?? raw) as Record<string, unknown>;
    const days = inner.days as
      | Array<{ day_number?: number; day?: number; activities: any[] }>
      | undefined;

    if (!Array.isArray(days) || days.length === 0) {
      return response.status(400).json({ error: "Invalid or empty itinerary" });
    }

    const { data: existingRows } = await supabase
      .from("trip_photo_guides")
      .select("day_number, guide_data")
      .eq("trip_id", tripId);

    const existingByDay = new Map<number, IPhotoGuideData>();
    for (const row of existingRows ?? []) {
      if (row.guide_data) {
        existingByDay.set(row.day_number, row.guide_data as IPhotoGuideData);
      }
    }

    const guides: Record<number, IPhotoGuideData> = {};

    for (const day of days) {
      const dayNum = day.day_number ?? day.day;
      if (typeof dayNum !== "number" || dayNum < 1 || !day.activities?.length)
        continue;

      const cached = existingByDay.get(dayNum);
      if (cached) {
        guides[dayNum] = cached;
        console.log(`${LOG_PREFIX} Using cached guide for day ${dayNum}`);
        continue;
      }

      const nameToImage: Record<string, string> = {};
      const nameToImageUrls: Record<string, string[]> = {};
      for (const a of day.activities) {
        const name = getActivityName(a);
        const urls = getActivityImageUrls(a);
        if (urls.length > 0) {
          nameToImage[name] = urls[0];
          nameToImageUrls[name] = urls;
        }
      }

      const guideData = await buildGuideForDay(
        trip.destination,
        day,
        nameToImage,
        nameToImageUrls,
      );
      guides[dayNum] = guideData;

      const { error: upsertError } = await supabase
        .from("trip_photo_guides")
        .upsert(
          {
            trip_id: tripId,
            day_number: dayNum,
            guide_data: guideData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "trip_id,day_number" },
        );

      if (upsertError) {
        console.error(
          `${LOG_PREFIX} Upsert error day ${dayNum}:`,
          upsertError.message,
        );
      } else {
        console.log(
          `${LOG_PREFIX} Generated and saved guide for day ${dayNum}`,
        );
      }
    }

    return response.status(200).json({ guides });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} generateAllPhotoGuides error:`, error);
    return response.status(500).json({
      error: "Failed to generate photo guides",
      details: error?.message,
    });
  }
};
