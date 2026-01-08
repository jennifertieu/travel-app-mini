// Map configuration and utilities for Leaflet integration

import L from "leaflet";
import { getIconSvgPath } from "./icon-mapping";

// Default map center (will be updated based on trip destination)
export const DEFAULT_MAP_CENTER: [number, number] = [40.7128, -74.006]; // NYC
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 18;

// Tile layer configuration - using CartoDB Positron for a cleaner, modern look
export const TILE_LAYER_CONFIG = {
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: MAX_ZOOM,
  minZoom: MIN_ZOOM,
};

// Custom marker icon configuration with confidence levels
export const createMarkerIcon = (
  confidence: "low" | "medium" | "high" = "medium",
  iconType?: string
) => {
  const colorConfig = {
    low: {
      primary: "#ef4444",
      secondary: "#fca5a5",
      gradient: "from-red-500 to-red-600",
      shadow: "rgba(239, 68, 68, 0.4)",
    },
    medium: {
      primary: "#f59e0b",
      secondary: "#fbbf24",
      gradient: "from-amber-500 to-amber-600",
      shadow: "rgba(245, 158, 11, 0.4)",
    },
    high: {
      primary: "#10b981",
      secondary: "#34d399",
      gradient: "from-emerald-500 to-emerald-600",
      shadow: "rgba(16, 185, 129, 0.4)",
    },
  };

  const config = colorConfig[confidence];
  const uniqueId = `grad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Get the SVG path data for the icon
  const iconPath = getIconSvgPath(iconType);

  // Modern pin-style marker with icon
  return L.divIcon({
    html: `
      <div class="marker-container relative" style="filter: drop-shadow(0 4px 12px ${config.shadow});">
        <svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="marker-svg">
          <!-- Pin shadow -->
          <ellipse cx="16" cy="40" rx="8" ry="3" fill="rgba(0, 0, 0, 0.15)"/>
          
          <!-- Pin body with gradient -->
          <path d="M16 0C10.477 0 6 4.477 6 10C6 16 16 28 16 28C16 28 26 16 26 10C26 4.477 21.523 0 16 0Z" 
                fill="url(#${uniqueId})" 
                stroke="white" 
                stroke-width="2"/>
          
          <!-- Inner circle background -->
          <circle cx="16" cy="10" r="6" fill="white" opacity="0.3"/>
          
          <!-- Icon container -->
          <g transform="translate(10, 4)">
            <circle cx="6" cy="6" r="5.5" fill="white"/>
            <g transform="translate(6, 6) scale(0.5) translate(-12, -12)" stroke="${config.primary}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              ${iconPath}
            </g>
          </g>
          
          <!-- Gradient definition -->
          <defs>
            <linearGradient id="${uniqueId}" x1="16" y1="0" x2="16" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="${config.secondary}"/>
              <stop offset="100%" stop-color="${config.primary}"/>
            </linearGradient>
          </defs>
        </svg>
        ${
          confidence === "low"
            ? `<div class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center shadow-lg" style="box-shadow: 0 2px 8px rgba(234, 179, 8, 0.5); z-index: 10;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round">
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>`
            : ""
        }
      </div>
    `,
    className: `custom-marker marker-${confidence}`,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -44],
  });
};

// Popup template for idea markers with enhanced information
export const createPopupContent = (
  title: string,
  summary?: string,
  tags?: string[],
  location?: { name?: string; confidence?: "low" | "medium" | "high" },
  costBucket?: string,
  durationBucket?: string
): string => {
  const tagsHtml =
    tags && tags.length > 0
      ? `<div class="flex flex-wrap gap-1 mt-2">${tags
          .slice(0, 3)
          .map(
            (tag) =>
              `<span class="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">${tag}</span>`
          )
          .join("")}</div>`
      : "";

  const confidenceColor = {
    low: "text-red-600",
    medium: "text-amber-600",
    high: "text-green-600",
  };

  const confidenceLabel = location?.confidence
    ? `<div class="text-xs mt-2 ${confidenceColor[location.confidence]}">
        Confidence: ${
          location.confidence.charAt(0).toUpperCase() +
          location.confidence.slice(1)
        }
      </div>`
    : "";

  const metaInfo =
    costBucket || durationBucket
      ? `<div class="text-xs text-muted-foreground mt-2 flex gap-2">
          ${costBucket ? `<span>💰 ${costBucket}</span>` : ""}
          ${durationBucket ? `<span>⏱️ ${durationBucket}</span>` : ""}
        </div>`
      : "";

  return `
    <div class="max-w-xs">
      <h3 class="font-semibold text-sm mb-1">${title}</h3>
      ${
        location?.name
          ? `<p class="text-xs font-medium text-foreground mb-1">📍 ${location.name}</p>`
          : ""
      }
      ${
        summary
          ? `<p class="text-xs text-muted-foreground mb-2">${summary.substring(
              0,
              100
            )}...</p>`
          : ""
      }
      ${metaInfo}
      ${tagsHtml}
      ${confidenceLabel}
    </div>
  `;
};

// Map bounds calculation for multiple markers
export const calculateMapBounds = (
  coordinates: Array<[number, number]>
): L.LatLngBounds | null => {
  if (coordinates.length === 0) return null;

  const bounds = L.latLngBounds(coordinates);
  return bounds;
};

// Fit map to bounds with padding
export const fitMapToBounds = (
  map: L.Map,
  bounds: L.LatLngBounds,
  padding: number = 50
) => {
  map.fitBounds(bounds, {
    padding: [padding, padding],
    maxZoom: DEFAULT_ZOOM,
  });
};

// Reverse geocoding helper to get neighborhood from coordinates
export const getNeighborhoodFromCoordinates = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  try {
    // Using OpenStreetMap Nominatim API for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
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

