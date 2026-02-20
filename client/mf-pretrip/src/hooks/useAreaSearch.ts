import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { createApiUrl, defaultFetchOptions } from "../lib/api";
import { parseSSEStream } from "../lib/sse";
import { useMember } from "../contexts/MemberContext";
import { queryKeys } from "../lib/queryKeys";
import { BoxCoordinates } from "./useRealtimeTrip";

interface AreaSearchProgress {
  current: number;
  total: number;
  message: string;
}

interface SuggestionEventPayload {
  progress: number;
  total: number;
  suggestion: { title?: string };
}

interface EnrichedEventPayload {
  progress: number;
  total: number;
}

interface ProgressEventPayload {
  step?: string;
  message?: string;
}

interface CompleteEventPayload {
  success: boolean;
  total: number;
  saved: number;
}

interface ErrorEventPayload {
  error: string;
  details?: string;
}

type AreaSearchEvent =
  | SuggestionEventPayload
  | EnrichedEventPayload
  | ProgressEventPayload
  | CompleteEventPayload
  | ErrorEventPayload;

export interface UseAreaSearchReturn {
  isSearching: boolean;
  progress: AreaSearchProgress | null;
  error: string | null;
  startSearch: (
    tripId: string,
    query: string,
    bounds: BoxCoordinates,
  ) => Promise<void>;
}

export const useAreaSearch = (): UseAreaSearchReturn => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const { member } = useMember();
  const queryClient = useQueryClient();

  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<AreaSearchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startSearch = async (
    tripId: string,
    query: string,
    bounds: BoxCoordinates,
  ) => {
    if (!member) {
      setError("Not logged in");
      return;
    }

    // Abort any in-flight search
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    setProgress({ current: 0, total: 3, message: "Starting area search..." });
    setError(null);

    try {
      const response = await fetch(
        createApiUrl("/suggestions/area-search/stream"),
        {
          method: "POST",
          ...defaultFetchOptions,
          body: JSON.stringify({
            tripId,
            query,
            bounds: {
              north: bounds.north,
              south: bounds.south,
              east: bounds.east,
              west: bounds.west,
            },
            createdBy: member.id,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const errorPayload = await response
          .json()
          .catch(() => ({ error: "Area search failed" }));
        throw new Error(errorPayload.error || "Area search failed");
      }

      await parseSSEStream<AreaSearchEvent>(
        response,
        {
          onEvent: (event, data) => {
            console.log(`🔍 [Area Search SSE] event: ${event}`, data);
            switch (event) {
              case "progress": {
                const payload = data as ProgressEventPayload;
                setProgress((prev) => ({
                  current: prev?.current ?? 0,
                  total: prev?.total ?? 3,
                  message: payload.message ?? prev?.message ?? "",
                }));
                break;
              }
              case "suggestion": {
                const payload = data as SuggestionEventPayload;
                setProgress({
                  current: payload.progress,
                  total: payload.total,
                  message: `Finding places... ${payload.progress}/${payload.total}`,
                });
                break;
              }
              case "enriched": {
                const payload = data as EnrichedEventPayload;
                setProgress((prev) => ({
                  current: prev?.current ?? payload.progress,
                  total: payload.total,
                  message: `Enriching places... ${payload.progress}/${payload.total}`,
                }));
                break;
              }
              case "complete": {
                const payload = data as CompleteEventPayload;
                console.log(
                  `🔍 [Area Search] Complete: ${payload.saved}/${payload.total} saved`,
                );
                setIsSearching(false);
                setProgress({
                  current: payload.saved,
                  total: payload.total,
                  message: "Search complete!",
                });
                // Invalidate and refetch ideas so new markers appear on map
                queryClient.invalidateQueries({
                  queryKey: queryKeys.ideas(tripId),
                });
                queryClient.refetchQueries({
                  queryKey: queryKeys.ideas(tripId),
                  exact: true,
                });
                if (payload.success && payload.saved > 0) {
                  toast.success("Places found!", {
                    description: `${payload.saved} places added to your map`,
                  });
                }
                break;
              }
              case "error": {
                const payload = data as ErrorEventPayload;
                console.error(`🔍 [Area Search] Error:`, payload);
                setError(payload.error || "Area search failed");
                setIsSearching(false);
                break;
              }
              default:
                break;
            }
          },
          onError: (parseError) => {
            setError(parseError.message);
            setIsSearching(false);
          },
        },
        controller.signal,
      );
    } catch (streamError) {
      if (controller.signal.aborted) return;
      setError(
        streamError instanceof Error
          ? streamError.message
          : "Area search failed",
      );
      setIsSearching(false);
    }
  };

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    isSearching,
    progress,
    error,
    startSearch,
  };
};
