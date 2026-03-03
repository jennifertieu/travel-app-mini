import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getApiUrl } from "../lib/api";
import type { PhotoGuideData } from "../types/itinerary";

export type SpotPhotosMap = Record<string, string[]>;

export interface UsePhotoGuideResult {
  data: PhotoGuideData | null;
  spotPhotos: SpotPhotosMap;
  isFetching: boolean;
  isLoading: boolean;
  regenerateAllLoading: boolean;
  error: string | null;
  generate: () => Promise<void>;
  generateAll: () => Promise<void>;
  refetch: () => Promise<void>;
  generateSelfie: (
    activityName: string,
    options?: { regenerate?: boolean },
  ) => Promise<string | null>;
  regenerateAllSelfies: () => Promise<void>;
}

export const usePhotoGuide = (
  tripId: string | null,
  dayNumber: number,
): UsePhotoGuideResult => {
  const [data, setData] = useState<PhotoGuideData | null>(null);
  const [spotPhotos, setSpotPhotos] = useState<SpotPhotosMap>({});
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [regenerateAllLoading, setRegenerateAllLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<number, PhotoGuideData>>({});

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
      // non-critical
    }
  }, [tripId]);

  const fetchFromSupabase = useCallback(
    async (force = false) => {
      if (!tripId || dayNumber < 1) {
        setData(null);
        setIsFetching(false);
        return;
      }
      if (!force && cache[dayNumber]) {
        setData(cache[dayNumber]);
        setIsFetching(false);
        return;
      }
      setError(null);
      setIsFetching(true);
      try {
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
          const guide = row.guide_data as unknown as PhotoGuideData;
          setData(guide);
          setCache((prev) => ({ ...prev, [dayNumber]: guide }));
        } else {
          setData(null);
        }
      } finally {
        setIsFetching(false);
      }
    },
    [tripId, dayNumber, cache],
  );

  const [preloaded, setPreloaded] = useState(false);
  useEffect(() => {
    if (!tripId || preloaded) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: rows } = await supabase
          .from("trip_photo_guides")
          .select("day_number, guide_data")
          .eq("trip_id", tripId);
        if (cancelled || !rows?.length) return;
        const bulk: Record<number, PhotoGuideData> = {};
        for (const row of rows) {
          if (row.guide_data) {
            bulk[row.day_number] = row.guide_data as unknown as PhotoGuideData;
          }
        }
        setCache((prev) => ({ ...prev, ...bulk }));
        if (bulk[dayNumber]) {
          setData(bulk[dayNumber]);
          setIsFetching(false);
        }
      } catch {
        // fallback to per-day fetch
      }
      if (!cancelled) setPreloaded(true);
    })();
    return () => { cancelled = true; };
  }, [tripId]);

  useEffect(() => {
    fetchFromSupabase();
    fetchSpotPhotos();
  }, [fetchFromSupabase, fetchSpotPhotos]);

  const generate = useCallback(async () => {
    if (!tripId || dayNumber < 1) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError("Not signed in"); setIsLoading(false); return; }

      const response = await fetch(getApiUrl(`/photo-guide/${tripId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
        const guide = json.guide_data as PhotoGuideData;
        setData(guide);
        setCache((prev) => ({ ...prev, [dayNumber]: guide }));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate photo guide");
    } finally {
      setIsLoading(false);
    }
  }, [tripId, dayNumber]);

  const generateAll = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError("Not signed in"); setIsLoading(false); return; }

      const response = await fetch(getApiUrl(`/photo-guide/${tripId}/generate-all`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        setError(errBody.error || `Request failed: ${response.status}`);
        setIsLoading(false);
        return;
      }

      const json = await response.json();
      if (json.guides && typeof json.guides[dayNumber] !== "undefined") {
        const guide = json.guides[dayNumber] as PhotoGuideData;
        setData(guide);
        setCache((prev) => ({ ...prev, [dayNumber]: guide }));
      } else {
        await fetchFromSupabase(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate photo guides");
    } finally {
      setIsLoading(false);
    }
  }, [tripId, dayNumber, fetchFromSupabase]);

  const generateSelfie = useCallback(
    async (activityName: string, options?: { regenerate?: boolean }): Promise<string | null> => {
      if (!tripId || dayNumber < 1 || !activityName?.trim()) return null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return null;

        const response = await fetch(getApiUrl(`/photo-guide/${tripId}/generate-selfie`), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ day_number: dayNumber, activity_name: activityName.trim(), regenerate: options?.regenerate ?? false }),
        });

        if (!response.ok) return null;

        const json = await response.json();
        if (json?.image_url) return json.image_url;
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
    const tipsWithImages = data.tips.filter((t) => t.image_url || (t.image_urls?.length ?? 0) > 0);
    if (!tipsWithImages.length) return;

    setRegenerateAllLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError("Not signed in"); return; }

      for (const tip of tipsWithImages) {
        await fetch(getApiUrl(`/photo-guide/${tripId}/generate-selfie`), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ day_number: dayNumber, activity_name: tip.activity_name, regenerate: true }),
        });
      }
      await fetchFromSupabase(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to regenerate examples");
    } finally {
      setRegenerateAllLoading(false);
    }
  }, [tripId, dayNumber, data?.tips, fetchFromSupabase]);

  return {
    data,
    spotPhotos,
    isFetching,
    isLoading,
    regenerateAllLoading,
    error,
    generate,
    generateAll,
    refetch: () => fetchFromSupabase(true),
    generateSelfie,
    regenerateAllSelfies,
  };
};
