"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

export interface DrawingPreview {
  userId: string;
  user: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
  };
  startLat: number;
  startLng: number;
  currentLat: number;
  currentLng: number;
  color: string;
  timestamp: number;
}

interface MapDrawingOverlayProps {
  map: L.Map | null;
  drawingPreviews: Record<string, DrawingPreview>;
}

export function MapDrawingOverlay({
  map,
  drawingPreviews,
}: MapDrawingOverlayProps) {
  const rectanglesRef = useRef<Record<string, L.Rectangle>>({});
  const labelsRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!map) return;

    const nextIds = new Set(Object.keys(drawingPreviews));

    // Remove rectangles that no longer exist
    Object.keys(rectanglesRef.current).forEach((userId) => {
      if (!nextIds.has(userId)) {
        rectanglesRef.current[userId].remove();
        labelsRef.current[userId]?.remove();
        delete rectanglesRef.current[userId];
        delete labelsRef.current[userId];
      }
    });

    // Add or update rectangles
    Object.values(drawingPreviews).forEach((preview) => {
      const bounds = L.latLngBounds(
        [preview.startLat, preview.startLng],
        [preview.currentLat, preview.currentLng],
      );

      const existing = rectanglesRef.current[preview.userId];

      if (existing) {
        // Update existing rectangle
        existing.setBounds(bounds);
      } else {
        // Create new rectangle
        const rectangle = L.rectangle(bounds, {
          color: preview.color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.1,
          dashArray: "5, 5", // Dashed border for preview
          interactive: false,
        });

        rectangle.addTo(map);
        rectanglesRef.current[preview.userId] = rectangle;

        // Create label marker
        const center = bounds.getCenter();
        const label = L.marker(center, {
          icon: createDrawingLabel(
            preview.user.displayName || "User",
            preview.color,
          ),
          interactive: false,
        });

        label.addTo(map);
        labelsRef.current[preview.userId] = label;
      }

      // Update label position to center of rectangle
      const center = bounds.getCenter();
      labelsRef.current[preview.userId]?.setLatLng(center);
    });
  }, [map, drawingPreviews]);

  useEffect(() => {
    if (!map) return;
    return () => {
      Object.values(rectanglesRef.current).forEach((rect) => rect.remove());
      Object.values(labelsRef.current).forEach((label) => label.remove());
      rectanglesRef.current = {};
      labelsRef.current = {};
    };
  }, [map]);

  return null;
}

function createDrawingLabel(displayName: string, color: string) {
  const safeName = escapeHtml(displayName);
  return L.divIcon({
    className: "rt-drawing-label",
    html: `
      <div style="
        padding: 4px 8px;
        background: ${color};
        color: #ffffff;
        font-size: 11px;
        font-weight: 600;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        white-space: nowrap;
        pointer-events: none;
      ">
        ${safeName} is drawing...
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
