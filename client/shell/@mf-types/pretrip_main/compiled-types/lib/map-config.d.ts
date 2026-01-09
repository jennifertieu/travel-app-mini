import L from "leaflet";
export declare const DEFAULT_MAP_CENTER: [number, number];
export declare const DEFAULT_ZOOM = 12;
export declare const MIN_ZOOM = 3;
export declare const MAX_ZOOM = 18;
export declare const TILE_LAYER_CONFIG: {
    url: string;
    attribution: string;
    maxZoom: number;
    minZoom: number;
};
export declare const createMarkerIcon: (confidence?: "low" | "medium" | "high", iconType?: string) => L.DivIcon;
export declare const createPopupContent: (title: string, summary?: string, tags?: string[], location?: {
    name?: string;
    confidence?: "low" | "medium" | "high";
}, costBucket?: string, durationBucket?: string) => string;
export declare const calculateMapBounds: (coordinates: Array<[number, number]>) => L.LatLngBounds | null;
export declare const fitMapToBounds: (map: L.Map, bounds: L.LatLngBounds, padding?: number) => void;
export declare const getNeighborhoodFromCoordinates: (lat: number, lng: number) => Promise<string | null>;
