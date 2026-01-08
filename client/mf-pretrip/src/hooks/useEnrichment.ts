import { useState, useCallback } from "react";

export interface EnrichmentRequest {
  url: string;
  comment?: string;
  trip: {
    destination: string;
    dates: { start: Date; end: Date };
  };
  profile: {
    dietary: string[];
    travelStyle: "chill" | "balanced" | "packed";
    interests: string[];
  };
}

export interface PlaceReview {
  authorName: string;
  authorUrl?: string;
  rating: number;
  text?: string;
  time: number;
  relativeTimeDescription: string;
  profilePhotoUrl?: string;
  language?: string;
}

export interface EnrichmentResponse {
  unfurl: {
    title: string;
    thumbnail: string;
    platform: "tiktok" | "youtube";
    embedHtml?: string;
    iframeUrl?: string;
  };
  ai: {
    summary: string;
    tags: string[];
    placeQuery: string;
    category?: string;
    costGuess?: "$" | "$$" | "$$$";
    durationGuess?: "30m" | "1-2h" | "half-day";
    iconType?: string;
  };
  place?: {
    provider: "google";
    placeId: string;
    name: string;
    address?: string;
    lat: number;
    lng: number;
    rating?: number;
    reviewCount?: number;
    priceLevel?: number;
    confidence: "low" | "medium" | "high";
    reviews?: PlaceReview[];
    photoUrl?: string;
    photos?: string[];
  };
}

export interface EnrichmentState {
  status: "idle" | "loading" | "success" | "error";
  data: EnrichmentResponse | null;
  error: string | null;
  retryCount: number;
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

export function useEnrichment() {
  const [state, setState] = useState<EnrichmentState>({
    status: "idle",
    data: null,
    error: null,
    retryCount: 0,
  });

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const enrich = useCallback(
    async (
      request: EnrichmentRequest,
      retryAttempt = 0
    ): Promise<EnrichmentResponse> => {
      setState((prev) => ({
        ...prev,
        status: "loading",
        error: null,
        retryCount: retryAttempt,
      }));

      try {
        const response = await fetch("http://localhost:5001/enrich", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error || `HTTP error! status: ${response.status}`;

          // Retry on server errors (5xx) or rate limiting (429)
          if (
            (response.status >= 500 || response.status === 429) &&
            retryAttempt < MAX_RETRIES
          ) {
            console.log(
              `Retrying enrichment (attempt ${
                retryAttempt + 1
              }/${MAX_RETRIES})...`
            );
            await delay(RETRY_DELAY * (retryAttempt + 1)); // Exponential backoff
            return enrich(request, retryAttempt + 1);
          }

          throw new Error(errorMessage);
        }

        const data: EnrichmentResponse = await response.json();

        // Check if response has error field (partial enrichment)
        if ("error" in data) {
          console.warn("Partial enrichment response:", data.error);
        }

        setState({
          status: "success",
          data,
          error: null,
          retryCount: retryAttempt,
        });
        return data;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        // Retry on network errors
        if (
          error instanceof TypeError &&
          error.message.includes("fetch") &&
          retryAttempt < MAX_RETRIES
        ) {
          console.log(
            `Retrying enrichment after network error (attempt ${
              retryAttempt + 1
            }/${MAX_RETRIES})...`
          );
          await delay(RETRY_DELAY * (retryAttempt + 1));
          return enrich(request, retryAttempt + 1);
        }

        setState({
          status: "error",
          data: null,
          error: errorMessage,
          retryCount: retryAttempt,
        });
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ status: "idle", data: null, error: null, retryCount: 0 });
  }, []);

  return {
    ...state,
    enrich,
    reset,
    isLoading: state.status === "loading",
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}

