"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { CursorPosition } from "../hooks/useRealtimeTrip";

interface MapCursorOverlayProps {
  map: L.Map | null;
  cursors: Record<string, CursorPosition>;
}

export function MapCursorOverlay({ map, cursors }: MapCursorOverlayProps) {
  const markersRef = useRef<Record<string, L.Marker>>({});
  const labelsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!map) return;

    const nextIds = new Set(Object.keys(cursors));

    // Remove markers that no longer exist
    Object.keys(markersRef.current).forEach((userId) => {
      if (!nextIds.has(userId)) {
        markersRef.current[userId].remove();
        delete markersRef.current[userId];
        delete labelsRef.current[userId];
      }
    });

    // Add or update markers
    Object.values(cursors).forEach((cursor) => {
      const userId = cursor.userId;
      // Generate a better fallback name from user ID if displayName is missing
      const displayName =
        cursor.user?.displayName?.trim() ||
        (userId ? `User ${userId.slice(0, 4)}` : "Guest");
      const color = colorFromId(userId);

      const existing = markersRef.current[userId];
      if (existing) {
        // Smoothly animate to new position
        existing.setLatLng([cursor.lat, cursor.lng]);

        // Ensure transition is applied (in case it was removed)
        const markerElement = existing.getElement();
        if (markerElement && !markerElement.style.transition) {
          markerElement.style.transition = "transform 0.15s ease-out";
        }

        const nextKey = `${displayName}|${color}`;
        if (labelsRef.current[userId] !== nextKey) {
          existing.setIcon(createCursorIcon({ displayName, color }));
          labelsRef.current[userId] = nextKey;
        }
        return;
      }

      const marker = L.marker([cursor.lat, cursor.lng], {
        icon: createCursorIcon({ displayName, color }),
        interactive: false,
        keyboard: false,
      });
      marker.addTo(map);

      // Add smooth transition to the marker element
      const markerElement = marker.getElement();
      if (markerElement) {
        markerElement.style.transition = "transform 0.15s ease-out";
      }

      markersRef.current[userId] = marker;
      labelsRef.current[userId] = `${displayName}|${color}`;
    });
  }, [map, cursors]);

  useEffect(() => {
    if (!map) return;
    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
      labelsRef.current = {};
    };
  }, [map]);

  return null;
}

function createCursorIcon({
  displayName,
  color,
}: {
  displayName: string;
  color: string;
}) {
  const safeName = escapeHtml(displayName);
  return L.divIcon({
    className: "rt-map-cursor",
    html: `
      <div style="
        position: relative;
        width: 200px;
        height: 30px;
        pointer-events: none;
      ">
        <div style="
          position: absolute;
          left: 0px;
          top: -4px;
          width: 12px;
          height: 12px;
        ">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M0 0 L12 4 L4 12 Z" fill="${color}" />
          </svg>
        </div>
        <div style="
          position: absolute;
          left: 10px;
          top: 2px;
          padding: 4px 10px;
          background: ${color};
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.2;
          border-radius: 9999px;
          box-shadow: 0 8px 18px rgba(0,0,0,0.2);
          white-space: nowrap;
        ">${safeName}</div>
      </div>
    `,
    iconSize: [200, 30],
    iconAnchor: [0, 12],
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

function colorFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 78% 56%)`;
}
