// Map configuration and utilities for Leaflet integration

import L from "leaflet";
import { getIconSvgPath, getCategoryColor } from "./icon-mapping";

// Default map center (will be updated based on trip destination)
export const DEFAULT_MAP_CENTER: [number, number] = [40.7128, -74.006]; // NYC
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 18;

// Tile layer configuration - using CARTO Voyager for a detailed, modern look
export const TILE_LAYER_CONFIG = {
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: MAX_ZOOM,
  minZoom: MIN_ZOOM,
};

/**
 * Creates a modern map pin marker icon.
 * Uses category-based coloring with an icon inside a white circle.
 * Design inspired by Figma "Map Pin (Community)" component.
 */
export const createMarkerIcon = (
  category?: string | null,
  iconType?: string,
  confidence?: "low" | "medium" | "high",
) => {
  const colorConfig = getCategoryColor(category);
  const fill = colorConfig.fill;
  const shadow = colorConfig.shadow;

  // Get the SVG path data for the icon
  const iconPath = getIconSvgPath(iconType || category || undefined);

  // Modern pin marker — rounded top with pointed bottom, white icon circle
  return L.divIcon({
    html: `
      <div class="map-pin-marker">
        <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Pin body — teardrop / balloon shape -->
          <path d="M20 2C11.163 2 4 9.163 4 18C4 26 20 48 20 48C20 48 36 26 36 18C36 9.163 28.837 2 20 2Z"
                fill="${fill}"
                stroke="white"
                stroke-width="2.5"/>

          <!-- Inner white circle for icon -->
          <circle cx="20" cy="17" r="10" fill="white"/>

          <!-- Category icon (Lucide-based, 24x24 scaled to fit) -->
          <g transform="translate(20, 17) scale(0.58) translate(-12, -12)"
             stroke="${fill}" stroke-width="2" fill="none"
             stroke-linecap="round" stroke-linejoin="round">
            ${iconPath}
          </g>
        </svg>
        ${
          confidence === "low"
            ? `<span class="map-pin-badge" style="
                position: absolute; top: -2px; right: -2px;
                width: 16px; height: 16px;
                background: #FBBF24; border: 2px solid white;
                border-radius: 50%; display: flex;
                align-items: center; justify-content: center;
                box-shadow: 0 1px 4px rgba(234,179,8,0.5);
              ">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round">
                  <line x1="12" y1="8" x2="12" y2="13"/>
                  <circle cx="12" cy="17" r="0.5" fill="white"/>
                </svg>
              </span>`
            : ""
        }
      </div>
    `,
    className: `custom-marker marker-cat-${(category || "other").toLowerCase()}`,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -52],
  });
};

// Popup template for idea markers with enhanced information
export const createPopupContent = (
  title: string,
  summary?: string,
  tags?: string[],
  location?: { name?: string; confidence?: "low" | "medium" | "high" },
  costBucket?: string,
  durationBucket?: string,
  category?: string | null,
): string => {
  const categoryColor = getCategoryColor(category);

  const tagsHtml =
    tags && tags.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">${tags
          .slice(0, 3)
          .map(
            (tag) =>
              `<span style="font-size:11px;background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:9999px;">${tag}</span>`,
          )
          .join("")}</div>`
      : "";

  const metaInfo =
    costBucket || durationBucket
      ? `<div style="display:flex;gap:8px;margin-top:6px;font-size:11px;color:#6b7280;">
          ${costBucket ? `<span>${costBucket}</span>` : ""}
          ${durationBucket ? `<span>⏱ ${durationBucket}</span>` : ""}
        </div>`
      : "";

  const categoryBadge = category
    ? `<span style="display:inline-block;font-size:10px;font-weight:600;color:${categoryColor.fill};background:${categoryColor.fill}15;padding:2px 6px;border-radius:9999px;text-transform:capitalize;">${category}</span>`
    : "";

  return `
    <div style="max-width:240px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <h3 style="font-weight:600;font-size:13px;margin:0;line-height:1.3;color:#111827;">${title}</h3>
        ${categoryBadge}
      </div>
      ${
        location?.name
          ? `<p style="font-size:11px;color:#6b7280;margin:0 0 4px 0;">📍 ${location.name}</p>`
          : ""
      }
      ${
        summary
          ? `<p style="font-size:11px;color:#9ca3af;margin:0 0 4px 0;line-height:1.4;">${summary.substring(0, 100)}${summary.length > 100 ? "..." : ""}</p>`
          : ""
      }
      ${metaInfo}
      ${tagsHtml}
    </div>
  `;
};

// Map bounds calculation for multiple markers
export const calculateMapBounds = (
  coordinates: Array<[number, number]>,
): L.LatLngBounds | null => {
  if (coordinates.length === 0) return null;

  const bounds = L.latLngBounds(coordinates);
  return bounds;
};

// Fit map to bounds with padding
export const fitMapToBounds = (
  map: L.Map,
  bounds: L.LatLngBounds,
  padding: number = 50,
) => {
  map.fitBounds(bounds, {
    padding: [padding, padding],
    maxZoom: DEFAULT_ZOOM,
  });
};

// Haversine formula to calculate distance between two lat/lng points in km
const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate area size in km² from annotation coordinates
export const calculateAreaSize = (
  coordinates: any, // BoxCoordinates | PolygonCoordinates
): number => {
  if (coordinates.type === "polygon" && coordinates.points) {
    // For polygons, use the Shoelace formula with Haversine-adjusted coordinates
    const points = coordinates.points;
    if (points.length < 3) return 0;

    // Convert lat/lng to approximate meters using a reference point (center)
    const centerLat =
      points.reduce((sum: number, p: any) => sum + p.lat, 0) / points.length;
    const centerLng =
      points.reduce((sum: number, p: any) => sum + p.lng, 0) / points.length;

    // Calculate area using Shoelace formula in km²
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const xi = haversineDistance(
        centerLat,
        centerLng,
        centerLat,
        points[i].lng,
      );
      const yi = haversineDistance(
        centerLat,
        centerLng,
        points[i].lat,
        centerLng,
      );
      const xj = haversineDistance(
        centerLat,
        centerLng,
        centerLat,
        points[j].lng,
      );
      const yj = haversineDistance(
        centerLat,
        centerLng,
        points[j].lat,
        centerLng,
      );

      // Adjust signs based on direction from center
      const signXi = points[i].lng < centerLng ? -1 : 1;
      const signYi = points[i].lat < centerLat ? -1 : 1;
      const signXj = points[j].lng < centerLng ? -1 : 1;
      const signYj = points[j].lat < centerLat ? -1 : 1;

      area += xi * signXi * yj * signYj - xj * signXj * yi * signYi;
    }
    return Math.abs(area) / 2;
  } else {
    // Rectangle: width × height in km
    const north = coordinates.north;
    const south = coordinates.south;
    const east = coordinates.east;
    const west = coordinates.west;

    const width = haversineDistance(north, west, north, east);
    const height = haversineDistance(north, west, south, west);

    return width * height;
  }
};

// Format area size for display
export const formatAreaSize = (areaSqKm: number): string => {
  if (areaSqKm < 0.01) {
    // Very small areas - show in m²
    return `~${Math.round(areaSqKm * 1_000_000)} m²`;
  } else if (areaSqKm < 1) {
    // Less than 1 km² - show with 2 decimals
    return `~${areaSqKm.toFixed(2)} km²`;
  } else {
    // 1 km² or more - show with 1 decimal
    return `~${areaSqKm.toFixed(1)} km²`;
  }
};

// Reverse geocoding helper to get neighborhood from coordinates
export const getNeighborhoodFromCoordinates = async (
  lat: number,
  lng: number,
): Promise<string | null> => {
  try {
    // Using OpenStreetMap Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    );
    const data = await response.json();

    // Extract neighborhood or city name
    return (
      data.address?.neighbourhood ||
      data.address?.suburb ||
      data.address?.city ||
      data.address?.town ||
      null
    );
  } catch (error) {
    console.error("Failed to get neighborhood:", error);
    return null;
  }
};
