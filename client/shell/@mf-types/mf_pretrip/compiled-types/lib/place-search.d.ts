export interface PlaceSearchResult {
    name: string;
    lat: number;
    lng: number;
    displayName: string;
    type: string;
}
export declare const searchPlaces: (query: string, bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}) => Promise<PlaceSearchResult[]>;
export declare const getNeighborhoodName: (lat: number, lng: number) => Promise<string | null>;
export declare const formatCoordinates: (lat: number, lng: number) => string;
