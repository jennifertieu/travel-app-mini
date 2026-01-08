import "leaflet/dist/leaflet.css";
import type { Database } from "@travel-app/shared-types";
type Idea = Database['public']['Tables']['trip_reel_ideas']['Row'];
interface MapViewProps {
    ideas: Idea[];
    center?: [number, number];
}
export declare function MapView({ ideas, center }: MapViewProps): import("react/jsx-runtime").JSX.Element;
export {};
