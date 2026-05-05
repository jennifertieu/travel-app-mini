import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createApiUrl, defaultFetchOptions } from "../lib/api";
import { parseSSEStream } from "../lib/sse";

/**
 * useStreamingSuggestions — drives the server-side generation pipeline via SSE.
 *
 * Ideas are NOT tracked here for display.  The server inserts rows into
 * `trip_reel_ideas` as it generates them, and the Supabase realtime
 * subscription in `useIdeas` pushes them straight into the React-Query cache.
 *
 * This hook only tracks **progress / status** so the UI can show a
 * generating overlay, progress bar, etc.
 */

export interface TripSuggestionInput {
  tripId: string;
  destination: string;
  durationDays: number | null;
  budgetLevel: string | null;
  interests: string[] | null;
  createdBy: string;
}

interface StreamingProgress {
  step?: string;
  message?: string;
  current?: number;
  total?: number;
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
  total?: number;
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

export const useStreamingSuggestions = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState<StreamingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startStreaming = async (tripData: TripSuggestionInput) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setIsComplete(false);
    setProgress({
      step: "starting",
      message: "Starting generation...",
      current: 0,
      total: 5,
    });
    setError(null);

    try {
      const response = await fetch(
        createApiUrl("/suggestions/generate/stream"),
        {
          method: "POST",
          ...defaultFetchOptions,
          body: JSON.stringify(tripData),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const errorPayload = await response
          .json()
          .catch(() => ({ error: "Failed to generate suggestions" }));
        throw new Error(errorPayload.error || "Failed to generate suggestions");
      }

      await parseSSEStream<
        | SuggestionEventPayload
        | EnrichedEventPayload
        | ProgressEventPayload
        | CompleteEventPayload
        | ErrorEventPayload
      >(
        response,
        {
          onEvent: (event, data) => {
            console.log(`🔵 [SSE] event: ${event}`, data);
            switch (event) {
              case "progress": {
                const payload = data as ProgressEventPayload;
                setProgress((prev) => ({
                  ...prev,
                  step: payload.step ?? prev?.step,
                  message: payload.message ?? prev?.message,
                  total: payload.total ?? prev?.total,
                }));
                break;
              }
              case "suggestion": {
                // Ideas arrive via Supabase realtime — just update progress here
                const payload = data as SuggestionEventPayload;
                console.log(
                  `🔵 [SSE] Suggestion ${payload.progress}/${payload.total}: ${payload.suggestion.title}`,
                );
                setProgress((prev) => ({
                  ...prev,
                  current: payload.progress,
                  total: payload.total,
                  message: `Adding ideas to your trip... (${payload.progress}/${payload.total})`,
                }));
                break;
              }
              case "enriched": {
                // Enrichment updates also arrive via Supabase realtime
                const payload = data as EnrichedEventPayload;
                console.log(
                  `🔵 [SSE] Enriched ${payload.progress}/${payload.total}`,
                );
                setProgress((prev) => ({
                  ...prev,
                  message: `Enriching places... (${payload.progress}/${payload.total})`,
                }));
                break;
              }
              case "complete": {
                const payload = data as CompleteEventPayload;
                console.log(
                  `🔵 [SSE] Complete: ${payload.saved}/${payload.total} saved`,
                );
                setIsComplete(payload.success);
                setIsStreaming(false);
                setProgress((prev) => ({
                  ...prev,
                  current: payload.saved,
                  total: payload.total,
                  message: "Ideas ready!",
                }));
                // Clean up localStorage
                localStorage.removeItem("generating-suggestions");
                localStorage.removeItem("pending-suggestion-input");
                if (payload.success && payload.saved > 0) {
                  toast.success("Ideas ready!", {
                    description: `${payload.saved} suggestions added to your trip`,
                  });
                }
                break;
              }
              case "error": {
                const payload = data as ErrorEventPayload;
                console.error(`🔵 [SSE] Error:`, payload);
                setError(payload.error || "Failed to generate suggestions");
                setIsStreaming(false);
                localStorage.removeItem("generating-suggestions");
                localStorage.removeItem("pending-suggestion-input");
                break;
              }
              default: {
                break;
              }
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
      setError(
        streamError instanceof Error
          ? streamError.message
          : "Failed to generate suggestions",
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
    startStreaming,
  };
};
