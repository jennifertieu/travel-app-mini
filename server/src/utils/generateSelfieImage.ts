import { gemini } from "../config.js";

/** Reference person image: shown first so the model composites this person into the scene. */
const PERSON_IMAGE_URL =
  "https://media.licdn.com/dms/image/v2/D5603AQELgsTzRuOUTA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1722792521123?e=1773878400&v=beta&t=cXcfQLbYH1Rle154brlS0hc6wDd-t_POL52j0Er5tPM";

const PERSON_SCENE_BASE =
  "Generate a single photorealistic travel photo of the person shown in the first image. They should appear in the foreground at the location shown in the following reference images, as if taking a photo or selfie there. Preserve the person's likeness from the first image. Natural lighting and a cohesive, realistic composition.";

function buildFallbackPrompt(
  challengeDescription?: string | null,
  poseIdea?: string | null
): string {
  if (challengeDescription?.trim()) {
    return `${PERSON_SCENE_BASE} The person must be doing this exact challenge: "${challengeDescription.trim()}" — show them visibly doing it (e.g. holding the item, doing the pose, or in the situation described).`;
  }
  if (poseIdea?.trim()) {
    return `${PERSON_SCENE_BASE} Pose idea: ${poseIdea.trim()}.`;
  }
  return `${PERSON_SCENE_BASE} The person should be holding a phone or posing for a selfie.`;
}

/**
 * Fetches image from URL and returns base64 string.
 */
async function fetchImageBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const data = buffer.toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const mimeType = contentType.split(";")[0].trim();
  return { data, mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType };
}

export interface GenerateSelfieOptions {
  /** Rich scene description for the image (from GPT-4o-mini). Preferred. */
  imagePrompt?: string | null;
  /** Fallback: challenge to show in the image. */
  challengeDescription?: string | null;
  /** Fallback: pose idea to hint composition. */
  poseIdea?: string | null;
}

const MAX_REFERENCE_IMAGES = 3;
/** Nano Banana 2 — Gemini 3.1 Flash Image. */
const MODEL = "gemini-3.1-flash-image-preview";

/**
 * Generates a photorealistic travel photo using Google Nano Banana 2 (Gemini image generation).
 * The first image sent is always the reference person (PERSON_IMAGE_URL); then place photos.
 * The model composites that person into the scene at the location.
 *
 * Cost (Gemini 3.1 Flash Image, ~2025): ~$60 per 1M images output + input tokens; ~$0.00006/image.
 * Logs duration to console (fetch + API call).
 *
 * @param placeImageUrls - One or more URLs of the photo spot (e.g. from Google Places). Up to 3 used.
 * @param options - imagePrompt (preferred, from GPT), or challengeDescription/poseIdea as fallback.
 * @returns Base64-encoded image.
 */
export async function generateSelfieImage(
  placeImageUrls: string | string[],
  options?: GenerateSelfieOptions
): Promise<string> {
  const urls = Array.isArray(placeImageUrls)
    ? placeImageUrls.slice(0, MAX_REFERENCE_IMAGES)
    : [placeImageUrls];
  if (urls.length === 0) {
    throw new Error("At least one place image URL is required");
  }

  const textPrompt = options?.imagePrompt?.trim()
    ? `The person in the first image should appear in this scene. ${options.imagePrompt.trim()}`
    : buildFallbackPrompt(options?.challengeDescription, options?.poseIdea);

  console.log("[generateSelfieImage] prompt:", textPrompt);

  const startMs = Date.now();

  const personPayload = await fetchImageBase64(PERSON_IMAGE_URL);
  const placePayloads = await Promise.all(urls.map((url) => fetchImageBase64(url)));

  const imageParts = [personPayload, ...placePayloads].map((p) => ({
    inlineData: { mimeType: p.mimeType, data: p.data },
  }));

  const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [
    ...imageParts,
    { text: textPrompt },
  ];

  const response = await gemini.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const elapsedMs = Date.now() - startMs;
  console.log(`[generateSelfieImage] completed in ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(2)}s)`);

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new Error("No content in Gemini image response");
  }

  for (const part of candidate.content.parts) {
    const partObj = part as { inlineData?: { data?: string }; text?: string };
    if (partObj.inlineData?.data) {
      return partObj.inlineData.data;
    }
  }

  throw new Error("No image data in Gemini response");
}
