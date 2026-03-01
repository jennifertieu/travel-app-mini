import { useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ActivityWithStatus } from "../../lib/utils";
import type { Activity } from "../../types/itinerary";
import type { Annotation } from "../../lib/annotation-utils";
import { renderAnnotations } from "../../lib/annotation-utils";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  TILE_LAYER_CONFIG,
  createMarkerIcon,
  createPopupContent,
} from "../../lib/map-config";

interface MapPanelProps {
  activities: (Activity | ActivityWithStatus)[];
  annotations?: Annotation[];
  userLocation?: { latitude: number; longitude: number } | null;
  focusedActivity?: Activity | null;
}

const USER_LOCATION_ICON = L.divIcon({
  html: `
    <div style="position:relative;width:20px;height:20px;">
      <div style="
        position:absolute;inset:0;
        background:rgba(59,130,246,0.2);
        border-radius:50%;
        animation:location-pulse 2s ease-out infinite;
      "></div>
      <div style="
        position:absolute;top:4px;left:4px;width:12px;height:12px;
        background:#3B82F6;
        border:2.5px solid white;
        border-radius:50%;
        box-shadow:0 1px 4px rgba(59,130,246,0.5);
      "></div>
    </div>
    <style>
      @keyframes location-pulse {
        0% { transform:scale(1); opacity:1; }
        100% { transform:scale(2.5); opacity:0; }
      }
    </style>
  `,
  className: "user-location-marker",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export function MapPanel({ activities, annotations, userLocation, focusedActivity }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const annotationLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

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
      userMarkerRef.current = null;
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

      const status = "status" in activity ? activity.status : undefined;
      const marker = L.marker(latLng, {
        icon: createMarkerIcon(activity.category, undefined, undefined, status),
        zIndexOffset: status === "current" ? 500 : 0,
      });

      marker.bindPopup(createPopupContent(activity.name, activity.description));

      markerGroup.addLayer(marker);
    }

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [activities]);

  // Render annotation shapes when annotations change or zoom changes
  useEffect(() => {
    const map = mapRef.current;
    const annotationGroup = annotationLayerRef.current;
    if (!map || !annotationGroup) return;

    const render = () => {
      if (!annotations?.length) {
        annotationGroup.clearLayers();
        return;
      }
      renderAnnotations(map, annotations, annotationGroup);
    };

    render();
    map.on("zoomend", render);
    return () => {
      map.off("zoomend", render);
    };
  }, [annotations]);

  // Fly to focused activity when selected from itinerary
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedActivity) return;

    // Resolve coordinates: prefer top-level lat/lng, fall back to location object
    let lat = focusedActivity.latitude;
    let lng = focusedActivity.longitude;
    if ((lat == null || lng == null) && focusedActivity.location && typeof focusedActivity.location === "object") {
      lat = focusedActivity.location.lat;
      lng = focusedActivity.location.lng;
    }

    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

    // Ensure map container has a valid size before flying (prevents Leaflet NaN projection errors)
    const size = map.getSize();
    if (!size.x || !size.y) {
      map.setView(L.latLng(lat, lng), 16);
      return;
    }

    map.flyTo(L.latLng(lat, lng), 16, { duration: 0.8 });
  }, [focusedActivity]);

  // User location blue dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    const latLng = L.latLng(userLocation.latitude, userLocation.longitude);

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latLng);
    } else {
      userMarkerRef.current = L.marker(latLng, {
        icon: USER_LOCATION_ICON,
        zIndexOffset: 1000,
      }).addTo(map);
      userMarkerRef.current.bindPopup(
        '<div style="font-family:system-ui;font-size:13px;font-weight:600;">You are here</div>',
      );
    }
  }, [userLocation]);

  return <div ref={containerRef} className="h-full w-full" />;
}
