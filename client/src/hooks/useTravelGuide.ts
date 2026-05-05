import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getApiUrl } from "@/lib/api";
import type { DestinationGuide, ActivitySpotlightsGuide } from "@/types";

type GuideType = "destination" | "spotlights";
type GuideData = DestinationGuide | ActivitySpotlightsGuide;

interface UseTravelGuideResult {
  data: GuideData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  regenerate: {
    mutate: () => void;
    isPending: boolean;
  };
}

async function callGuideEndpoint(
  tripId: string,
  path: string,
): Promise<GuideData> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(getApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  const json = await res.json();
  return json.guide_data;
}

export function useTravelGuide(
  tripId: string | null,
  guideType: GuideType,
): UseTravelGuideResult {
  const [data, setData] = useState<GuideData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track last fetched to avoid re-fetching on every render
  const fetchedFor = useRef<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await callGuideEndpoint(
        tripId,
        `/travel-guide/${tripId}/${guideType}`,
      );
      // Only mark as fetched if we got real data (avoid caching empty spotlights)
      const spotlights = (result as any)?.spotlights;
      const hasData = !Array.isArray(spotlights) || spotlights.length > 0;
      if (hasData) {
        fetchedFor.current = `${tripId}-${guideType}`;
      }
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load travel guide");
    } finally {
      setIsLoading(false);
    }
  }, [tripId, guideType]);

  useEffect(() => {
    const key = `${tripId}-${guideType}`;
    if (tripId && fetchedFor.current !== key) {
      fetch_();
    }
  }, [tripId, guideType, fetch_]);

  const regenerateMutate = useCallback(async () => {
    if (!tripId) return;
    setIsRegenerating(true);
    setError(null);
    try {
      const result = await callGuideEndpoint(
        tripId,
        `/travel-guide/${tripId}/regenerate/${guideType}`,
      );
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to regenerate guide");
    } finally {
      setIsRegenerating(false);
    }
  }, [tripId, guideType]);

  return {
    data,
    isLoading,
    error,
    refetch: fetch_,
    regenerate: {
      mutate: regenerateMutate,
      isPending: isRegenerating,
    },
  };
}
