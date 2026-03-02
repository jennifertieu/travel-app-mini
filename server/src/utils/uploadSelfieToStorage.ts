import { supabase } from "../config.js";

const BUCKET = "photo-guide-selfies";
const SUPABASE_URL = process.env.SUPABASE_URL!;

/**
 * Uploads a base64-encoded PNG image to Supabase Storage and returns the public URL.
 * Path: {tripId}/{dayNumber}/{activityName}.png
 */
export async function uploadSelfieToStorage(
  base64Data: string,
  tripId: string,
  dayNumber: number,
  activityName: string,
): Promise<string> {
  const buffer = Buffer.from(base64Data, "base64");
  // Sanitize activity name for use as filename
  const safeName = activityName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const path = `${tripId}/${dayNumber}/${safeName}.png`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) {
    console.warn(`[uploadSelfie] Upload failed for ${path}:`, error.message);
    throw error;
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
