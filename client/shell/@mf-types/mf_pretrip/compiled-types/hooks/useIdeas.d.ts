/**
 * Fetch all ideas for a trip with realtime subscription
 */
export declare function useIdeas(tripId: string | null): import("@tanstack/react-query").UseQueryResult<{
    category: string | null;
    comment: string | null;
    cost_bucket: string | null;
    created_at: string;
    created_by: string;
    duration_bucket: string | null;
    enrichment_status: string;
    icon_type: string | null;
    id: string;
    latitude: number | null;
    location: import("@travel-app/shared-types/src/database.types").Json | null;
    longitude: number | null;
    place: import("@travel-app/shared-types/src/database.types").Json | null;
    source_canonical_url: string | null;
    source_platform: string;
    source_url: string;
    source_video_id: string;
    summary: string | null;
    tags: string[] | null;
    time_of_day: string | null;
    title: string | null;
    trip_id: string;
    updated_at: string;
}[], Error>;
/**
 * Add a new idea
 */
export declare function useAddIdea(): import("@tanstack/react-query").UseMutationResult<{
    category: string | null;
    comment: string | null;
    cost_bucket: string | null;
    created_at: string;
    created_by: string;
    duration_bucket: string | null;
    enrichment_status: string;
    icon_type: string | null;
    id: string;
    latitude: number | null;
    location: import("@travel-app/shared-types/src/database.types").Json | null;
    longitude: number | null;
    place: import("@travel-app/shared-types/src/database.types").Json | null;
    source_canonical_url: string | null;
    source_platform: string;
    source_url: string;
    source_video_id: string;
    summary: string | null;
    tags: string[] | null;
    time_of_day: string | null;
    title: string | null;
    trip_id: string;
    updated_at: string;
}, Error, {
    category?: string | null;
    comment?: string | null;
    cost_bucket?: string | null;
    created_at?: string;
    created_by: string;
    duration_bucket?: string | null;
    enrichment_status?: string;
    icon_type?: string | null;
    id?: string;
    latitude?: number | null;
    location?: import("@travel-app/shared-types/src/database.types").Json | null;
    longitude?: number | null;
    place?: import("@travel-app/shared-types/src/database.types").Json | null;
    source_canonical_url?: string | null;
    source_platform: string;
    source_url: string;
    source_video_id: string;
    summary?: string | null;
    tags?: string[] | null;
    time_of_day?: string | null;
    title?: string | null;
    trip_id: string;
    updated_at?: string;
}, unknown>;
/**
 * Update an idea (for enrichment data)
 */
export declare function useUpdateIdea(): import("@tanstack/react-query").UseMutationResult<{
    category: string | null;
    comment: string | null;
    cost_bucket: string | null;
    created_at: string;
    created_by: string;
    duration_bucket: string | null;
    enrichment_status: string;
    icon_type: string | null;
    id: string;
    latitude: number | null;
    location: import("@travel-app/shared-types/src/database.types").Json | null;
    longitude: number | null;
    place: import("@travel-app/shared-types/src/database.types").Json | null;
    source_canonical_url: string | null;
    source_platform: string;
    source_url: string;
    source_video_id: string;
    summary: string | null;
    tags: string[] | null;
    time_of_day: string | null;
    title: string | null;
    trip_id: string;
    updated_at: string;
}, Error, {
    category?: string | null;
    comment?: string | null;
    cost_bucket?: string | null;
    created_at?: string;
    created_by?: string;
    duration_bucket?: string | null;
    enrichment_status?: string;
    icon_type?: string | null;
    id?: string;
    latitude?: number | null;
    location?: import("@travel-app/shared-types/src/database.types").Json | null;
    longitude?: number | null;
    place?: import("@travel-app/shared-types/src/database.types").Json | null;
    source_canonical_url?: string | null;
    source_platform?: string;
    source_url?: string;
    source_video_id?: string;
    summary?: string | null;
    tags?: string[] | null;
    time_of_day?: string | null;
    title?: string | null;
    trip_id?: string;
    updated_at?: string;
} & {
    id: string;
}, unknown>;
/**
 * Delete an idea
 */
export declare function useDeleteIdea(): import("@tanstack/react-query").UseMutationResult<{
    ideaId: string;
    tripId: string;
}, Error, {
    ideaId: string;
    tripId: string;
}, unknown>;
