import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { createApiUrl } from "../lib/api";

interface StreamingItineraryState {
  isStreaming: boolean;
  progress: {
    step: string;
    message: string;
  } | null;
  error: string | null;
  isComplete: boolean;
  itinerary: any | null;
}

export function useStreamingItinerary() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<StreamingItineraryState>({
    isStreaming: false,
    progress: null,
    error: null,
    isComplete: false,
    itinerary: null,
  });

  const buildItinerary = useCallback(async (tripId: string) => {
    console.log("🚀 Starting streaming itinerary generation:", tripId);

    setState({
      isStreaming: true,
      progress: { step: 'starting', message: 'Starting itinerary generation...' },
      error: null,
      isComplete: false,
      itinerary: null,
    });

    try {
      const response = await fetch(createApiUrl(`/itinerary/${tripId}/stream`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Remove hardcoded auth header - let the API handle auth
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body received");
      }

      console.log("✅ SSE connection established for itinerary");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("📡 SSE stream ended");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        let currentData = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            currentData = line.slice(6);
          } else if (line === "" && currentEvent && currentData) {
            // Process complete SSE message
            try {
              const data = JSON.parse(currentData);
              console.log(`📨 Received ${currentEvent} event:`, data);

              if (currentEvent === "progress") {
                setState((prev) => ({
                  ...prev,
                  progress: {
                    step: data.step,
                    message: data.message,
                  },
                }));
              } else if (currentEvent === "itinerary_progress") {
                // Handle specific itinerary progress events
                setState((prev) => ({
                  ...prev,
                  progress: {
                    step: data.step,
                    message: data.message,
                  },
                }));
              } else if (currentEvent === "complete") {
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  isComplete: true,
                  itinerary: data.itinerary || data,
                  progress: {
                    step: "complete",
                    message: "Itinerary generation complete!",
                  },
                }));

                // Invalidate queries to trigger refetch
                queryClient.invalidateQueries({
                  queryKey: queryKeys.tripData(tripId, "itinerary"),
                });
                console.log("🎉 Itinerary generation complete!");
                break;
              } else if (currentEvent === "error") {
                setState((prev) => ({
                  ...prev,
                  isStreaming: false,
                  error: data.error || data.message || "Unknown error",
                }));
                console.error("❌ SSE error event:", data);
                break;
              }

              // Reset for next message
              currentEvent = "";
              currentData = "";
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError, {
                event: currentEvent,
                data: currentData,
              });
              currentEvent = "";
              currentData = "";
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Streaming itinerary error:", error);
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [queryClient]);

  const reset = useCallback(() => {
    setState({
      isStreaming: false,
      progress: null,
      error: null,
      isComplete: false,
      itinerary: null,
    });
  }, []);

  return {
    ...state,
    buildItinerary,
    reset,
  };
}