import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getApiUrl } from "../lib/api";
import type { PhotoGuideData } from "../types";

/** Map of activity_name → array of Google Places photo URLs from trip_reel_ideas */
export type SpotPhotosMap = Record<string, string[]>;

interface UsePhotoGuideResult {
  data: PhotoGuideData | null;
  /** Extra Google Places photos keyed by activity name (from trip_reel_ideas) */
  spotPhotos: SpotPhotosMap;
  isLoading: boolean;
  /** True while regenerating all selfie examples for the current day's tips. */
  regenerateAllLoading: boolean;
  error: string | null;
  generate: () => Promise<void>;
  /** Generate photo guides + selfies for all days of the trip at once; then refetches current day. */
  generateAll: () => Promise<void>;
  refetch: () => Promise<void>;
  /** Returns data URL of generated selfie image, or null on error. Pass regenerate: true to skip cache. */
  generateSelfie: (activityName: string, options?: { regenerate?: boolean }) => Promise<string | null>;
  /** Regenerate AI example selfies for all tips on the current day at once; then refetches. */
  regenerateAllSelfies: () => Promise<void>;
}

export const usePhotoGuide = (
  tripId: string | null,
  dayNumber: number,
): UsePhotoGuideResult => {
  const [data, setData] = useState<PhotoGuideData | null>(null);
  const [spotPhotos, setSpotPhotos] = useState<SpotPhotosMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [regenerateAllLoading, setRegenerateAllLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fetch Google Places photos from trip_reel_ideas for this trip */
  const fetchSpotPhotos = useCallback(async () => {
    if (!tripId) return;
    try {
      const { data: ideas } = await supabase
        .from("trip_reel_ideas")
        .select("title, place")
        .eq("trip_id", tripId)
        .not("place", "is", null);
      if (!ideas) return;
      const map: SpotPhotosMap = {};
      for (const idea of ideas) {
        const photos = (idea.place as { photos?: string[] })?.photos;
        if (photos?.length && idea.title) {
          map[idea.title] = photos;
        }
      }
      setSpotPhotos(map);
    } catch {
      // non-critical — just won't have extra photos
    }
  }, [tripId]);

  const fetchFromSupabase = useCallback(async () => {
    if (!tripId || dayNumber < 1) {
      setData(null);
      return;
    }
    setError(null);
    const { data: row, error: fetchError } = await supabase
      .from("trip_photo_guides")
      .select("guide_data")
      .eq("trip_id", tripId)
      .eq("day_number", dayNumber)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      setData(null);
      return;
    }
    if (row?.guide_data) {
      setData(row.guide_data as unknown as PhotoGuideData);
    } else {
      setData(null);
    }
  }, [tripId, dayNumber]);

  useEffect(() => {
    fetchFromSupabase();
    fetchSpotPhotos();
  }, [fetchFromSupabase, fetchSpotPhotos]);

  const generate = useCallback(async () => {
    if (!tripId || dayNumber < 1) return;
    setIsLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not signed in");
        setIsLoading(false);
        return;
      }

      const response = await fetch(getApiUrl(`/photo-guide/${tripId}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ day_number: dayNumber }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        setError(errBody.error || `Request failed: ${response.status}`);
        setIsLoading(false);
        return;
      }

      const json = await response.json();
      if (json.guide_data) {
        setData(json.guide_data as PhotoGuideData);
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to generate photo guide",
      );
    } finally {
      setIsLoading(false);
    }
  }, [tripId, dayNumber]);

  const generateAll = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not signed in");
        setIsLoading(false);
        return;
      }

      const response = await fetch(getApiUrl(`/photo-guide/${tripId}/generate-all`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        setError(errBody.error || `Request failed: ${response.status}`);
        setIsLoading(false);
        return;
      }

      const json = await response.json();
      if (json.guides && typeof json.guides[dayNumber] !== "undefined") {
        setData(json.guides[dayNumber] as PhotoGuideData);
      } else {
        await fetchFromSupabase();
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to generate photo guides",
      );
    } finally {
      setIsLoading(false);
    }
  }, [tripId, dayNumber, fetchFromSupabase]);

  const generateSelfie = useCallback(
    async (activityName: string, options?: { regenerate?: boolean }): Promise<string | null> => {
      if (!tripId || dayNumber < 1 || !activityName?.trim()) return null;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return null;

        const response = await fetch(
          getApiUrl(`/photo-guide/${tripId}/generate-selfie`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              day_number: dayNumber,
              activity_name: activityName.trim(),
              regenerate: options?.regenerate ?? false,
            }),
          },
        );

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          console.warn("generateSelfie failed:", errBody.error);
          return null;
        }

        const json = await response.json();
        const b64 = json?.image_base64;
        if (typeof b64 !== "string") return null;
        return `data:image/png;base64,${b64}`;
      } catch {
        return null;
      }
    },
    [tripId, dayNumber],
  );

  const regenerateAllSelfies = useCallback(async () => {
    if (!tripId || dayNumber < 1 || !data?.tips?.length) return;
    const tipsWithImages = data.tips.filter(
      (t) => t.image_url || (t.image_urls?.length ?? 0) > 0,
    );
    if (!tipsWithImages.length) return;

    setRegenerateAllLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not signed in");
        return;
      }

      for (const tip of tipsWithImages) {
        await fetch(getApiUrl(`/photo-guide/${tripId}/generate-selfie`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            day_number: dayNumber,
            activity_name: tip.activity_name,
            regenerate: true,
          }),
        });
      }

      await fetchFromSupabase();
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to regenerate examples",
      );
    } finally {
      setRegenerateAllLoading(false);
    }
  }, [tripId, dayNumber, data?.tips, fetchFromSupabase]);

  return {
    data,
    spotPhotos,
    isLoading,
    regenerateAllLoading,
    error,
    generate,
    generateAll,
    refetch: fetchFromSupabase,
    generateSelfie,
    regenerateAllSelfies,
  };
};
