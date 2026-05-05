import { useEffect, useRef, useState } from "react";
import { createApiUrl, defaultFetchOptions } from "../lib/api";
import { parseSSEStream } from "../lib/sse";
import type { TripSuggestionInput } from "./useStreamingSuggestions";

/**
 * useStreamingHotels — drives the hotel generation pipeline via SSE.
 *
 * Mirrors useStreamingSuggestions but hits /suggestions/hotels/stream.
 * Does NOT show its own toast — the combined toast is handled by TripView.
 */

interface StreamingProgress {
  step?: string;
  message?: string;
  current?: number;
  total?: number;
}

export const useStreamingHotels = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState<StreamingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const startStreaming = async (tripData: TripSuggestionInput) => {
    console.log("🏨 [useStreamingHotels] startStreaming called with:", {
      tripId: tripData.tripId,
      destination: tripData.destination,
      budgetLevel: tripData.budgetLevel,
      durationDays: tripData.durationDays,
    });
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setIsComplete(false);
    setSavedCount(0);
    setProgress({
      step: "starting",
      message: "Finding hotels...",
      current: 0,
      total: 5,
    });
    setError(null);

    try {
      const url = createApiUrl("/suggestions/hotels/stream");
      console.log("🏨 [useStreamingHotels] Fetching:", url);
      const response = await fetch(url, {
        method: "POST",
        ...defaultFetchOptions,
        body: JSON.stringify(tripData),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.error(
          "🏨 [useStreamingHotels] Response not OK:",
          response.status,
          response.statusText,
        );
        const errorPayload = await response
          .json()
          .catch(() => ({ error: "Failed to generate hotel suggestions" }));
        throw new Error(
          errorPayload.error || "Failed to generate hotel suggestions",
        );
      }

      await parseSSEStream(
        response,
        {
          onEvent: (event, data: any) => {
            console.log(`🏨 [useStreamingHotels] SSE event: ${event}`, data);
            switch (event) {
              case "progress":
                setProgress((prev) => ({
                  ...prev,
                  step: data.step ?? prev?.step,
                  message: data.message ?? prev?.message,
                  total: data.total ?? prev?.total,
                }));
                break;
              case "suggestion":
                setProgress((prev) => ({
                  ...prev,
                  current: data.progress,
                  total: data.total,
                  message: `Finding hotels... (${data.progress}/${data.total})`,
                }));
                break;
              case "enriched":
                setProgress((prev) => ({
                  ...prev,
                  message: `Enriching hotels... (${data.progress}/${data.total})`,
                }));
                break;
              case "complete":
                setIsComplete(data.success);
                setIsStreaming(false);
                setSavedCount(data.saved || 0);
                setProgress((prev) => ({
                  ...prev,
                  current: data.saved,
                  total: data.total,
                  message: "Hotels ready!",
                }));
                // No toast here — combined toast handled by TripView
                break;
              case "error":
                setError(data.error || "Failed to generate hotel suggestions");
                setIsStreaming(false);
                break;
            }
          },
          onError: (parseError) => {
            setError(parseError.message);
            setIsStreaming(false);
          },
        },
        controller.signal,
      );
    } catch (streamError) {
      if (controller.signal.aborted) return;
      console.error("🏨 [useStreamingHotels] Stream error:", streamError);
      setError(
        streamError instanceof Error
          ? streamError.message
          : "Failed to generate hotel suggestions",
      );
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    isStreaming,
    isComplete,
    progress,
    error,
    savedCount,
    startStreaming,
  };
};
