/**
 * Fetch a single trip by ID
 */
export declare function useTrip(tripId: string | null): import("@tanstack/react-query").UseQueryResult<{
    created_at: string;
    created_by: string | null;
    destination: string;
    destination_lat: number | null;
    destination_lng: number | null;
    end_date: string | null;
    id: string;
    start_date: string | null;
    title: string | null;
    updated_at: string;
}, Error>;
/**
 * Create a new trip
 */
export declare function useCreateTrip(): import("@tanstack/react-query").UseMutationResult<{
    created_at: string;
    created_by: string | null;
    destination: string;
    destination_lat: number | null;
    destination_lng: number | null;
    end_date: string | null;
    id: string;
    start_date: string | null;
    title: string | null;
    updated_at: string;
}, Error, {
    created_at?: string;
    created_by?: string | null;
    destination: string;
    destination_lat?: number | null;
    destination_lng?: number | null;
    end_date?: string | null;
    id?: string;
    start_date?: string | null;
    title?: string | null;
    updated_at?: string;
}, unknown>;
/**
 * Update an existing trip
 */
export declare function useUpdateTrip(tripId: string): import("@tanstack/react-query").UseMutationResult<{
    created_at: string;
    created_by: string | null;
    destination: string;
    destination_lat: number | null;
    destination_lng: number | null;
    end_date: string | null;
    id: string;
    start_date: string | null;
    title: string | null;
    updated_at: string;
}, Error, {
    created_at?: string;
    created_by?: string | null;
    destination?: string;
    destination_lat?: number | null;
    destination_lng?: number | null;
    end_date?: string | null;
    id?: string;
    start_date?: string | null;
    title?: string | null;
    updated_at?: string;
}, unknown>;
