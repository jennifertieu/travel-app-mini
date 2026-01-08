export interface EnrichmentRequest {
    url: string;
    comment?: string;
    trip: {
        destination: string;
        dates: {
            start: Date;
            end: Date;
        };
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
export declare function useEnrichment(): {
    enrich: (request: EnrichmentRequest, retryAttempt?: number) => Promise<EnrichmentResponse>;
    reset: () => void;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    status: "idle" | "loading" | "success" | "error";
    data: EnrichmentResponse | null;
    error: string | null;
    retryCount: number;
};
