import { useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Activity } from "../types";
import type { Annotation } from "../lib/annotation-utils";
import { renderAnnotations } from "../lib/annotation-utils";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  TILE_LAYER_CONFIG,
  createMarkerIcon,
  createPopupContent,
} from "../lib/map-config";

interface MapPanelProps {
  activities: Activity[];
  annotations?: Annotation[];
}

export function MapPanel({ activities, annotations }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const annotationLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer(TILE_LAYER_CONFIG.url, {
      attribution: TILE_LAYER_CONFIG.attribution,
      maxZoom: TILE_LAYER_CONFIG.maxZoom,
      minZoom: TILE_LAYER_CONFIG.minZoom,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    annotationLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // ResizeObserver to handle container resize
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      annotationLayerRef.current = null;
    };
  }, []);

  // Update markers when activities change
  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markersRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    const validActivities = activities.filter(
      (a) => a.latitude != null && a.longitude != null,
    );

    if (validActivities.length === 0) {
      map.setView(DEFAULT_MAP_CENTER, DEFAULT_ZOOM);
      return;
    }

    const bounds = L.latLngBounds([]);

    for (const activity of validActivities) {
      const latLng = L.latLng(activity.latitude!, activity.longitude!);
      bounds.extend(latLng);

      const marker = L.marker(latLng, {
        icon: createMarkerIcon(activity.category),
      });

      marker.bindPopup(createPopupContent(activity.name, activity.description));

      markerGroup.addLayer(marker);
    }

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [activities]);

  // Render annotation shapes when annotations change
  useEffect(() => {
    const map = mapRef.current;
    const annotationGroup = annotationLayerRef.current;
    if (!map || !annotationGroup) return;

    if (!annotations?.length) {
      annotationGroup.clearLayers();
      return;
    }

    renderAnnotations(map, annotations, annotationGroup);
  }, [annotations]);

  return <div ref={containerRef} className="h-full w-full" />;
}
