"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  TILE_LAYER_CONFIG,
  createMarkerIcon,
  createPopupContent,
} from "../../lib/map-config";
import type { Database } from "@travel-app/shared-types";

type Idea = Database['public']['Tables']['trip_reel_ideas']['Row'];

interface MapViewProps {
  ideas: Idea[];
  center?: [number, number];
}

export function MapView({ ideas, center = DEFAULT_MAP_CENTER }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(center, DEFAULT_ZOOM);

    L.tileLayer(TILE_LAYER_CONFIG.url, {
      attribution: TILE_LAYER_CONFIG.attribution,
      maxZoom: TILE_LAYER_CONFIG.maxZoom,
      minZoom: TILE_LAYER_CONFIG.minZoom,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center]);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const newMarkers: L.Marker[] = [];
    const bounds: L.LatLngBounds | null = ideas.length > 0 ? L.latLngBounds([]) : null;

    ideas.forEach((idea) => {
      const { latitude, longitude } = idea;
      
      if (!latitude || !longitude) return;

      const location = idea.location as any;

      const confidence = location?.confidence || "medium";
      const icon = createMarkerIcon(confidence, idea.icon_type || undefined);
      const marker = L.marker([latitude, longitude], { icon });

      const popupContent = createPopupContent(
        idea.title || "Untitled",
        idea.summary || undefined,
        idea.tags || undefined,
        location,
        idea.cost_bucket || undefined,
        idea.duration_bucket || undefined
      );

      marker.bindPopup(popupContent);
      marker.addTo(mapRef.current!);

      newMarkers.push(marker);

      if (bounds) {
        bounds.extend([latitude, longitude]);
      }
    });

    markersRef.current = newMarkers;

    if (bounds && mapRef.current && ideas.length > 0) {
      mapRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: DEFAULT_ZOOM,
      });
    }
  }, [ideas]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />
      
      {/* No ideas overlay */}
      {ideas.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <p className="text-sm text-muted-foreground">
              Add ideas to see them on the map
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

