"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_ZOOM,
  TILE_LAYER_CONFIG,
  createMarkerIcon,
  createPopupContent,
  calculateAreaSize,
  getNeighborhoodFromCoordinates,
} from "../../lib/map-config";
import type { Database } from "@travel-app/shared-types";
import { MapCursorOverlay } from "../MapCursorOverlay";
import { MapDrawingOverlay } from "../MapDrawingOverlay";
import {
  Annotation,
  AnnotationCoordinates,
  useRealtimeTrip,
} from "../../hooks/useRealtimeTrip";
import { AnnotationModal } from "../modals/AnnotationModal";
import { KeyboardShortcutsModal } from "../modals/KeyboardShortcutsModal";
import { MapToolbar } from "../MapToolbar";
import { useMember } from "../../contexts/MemberContext";
import { supabase } from "../../lib/supabase";
import { useAreaSearch } from "../../hooks/useAreaSearch";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];

// ── Annotation label helper ─────────────────────────────────────
const COLOR_ICON_MAP: Record<string, string> = {
  "#3B82F6": "\u{1F3E8}", // Blue - Hotels
  "#EF4444": "\u2B50", // Red - Priority
  "#10B981": "\u{1F333}", // Green - Nature
  "#F59E0B": "\u{1F37D}\uFE0F", // Yellow - Food
  "#8B5CF6": "\u{1F389}", // Purple - Fun
};

function escapeAnnotationHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const NEUTRAL_ANNOTATION_COLOR = "#6B7280"; // Gray for uncategorized

function createAnnotationIcon(
  ann: {
    color?: string | null;
    label?: string | null;
    intent?: string | null;
    name?: string | null;
  },
  isHighlighted: boolean,
): L.DivIcon {
  const color = ann.color ?? NEUTRAL_ANNOTATION_COLOR;
  const icon =
    ann.intent === "search_area"
      ? "\u{1F50D}"
      : ann.color
        ? COLOR_ICON_MAP[ann.color] || "\u{1F4DD}"
        : "\u{1F4DD}"; // Generic note for uncategorized

  const displayName = ann.name || ann.label || "";
  const safeName = escapeAnnotationHtml(
    displayName.length > 24 ? displayName.slice(0, 24) + "\u2026" : displayName,
  );

  // Show full note on hover only if there's both a name and a separate label
  const hasNote = ann.name && ann.label && ann.name !== ann.label;
  const safeNote = hasNote ? escapeAnnotationHtml(ann.label!) : "";

  const highlightedClass = isHighlighted ? " highlighted" : "";

  return L.divIcon({
    className: "map-annotation-icon",
    html: `
      <div class="map-annotation-card${highlightedClass}" style="--annotation-color: ${color};">
        <div class="ann-header">
          <span class="ann-icon">${icon}</span>
          <span class="ann-title">${safeName}</span>
        </div>
        ${hasNote ? `<div class="ann-note">${safeNote}</div>` : ""}
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export interface MapViewProps {
  ideas: Idea[];
  center?: [number, number];
  tripId: string | null;
  highlightedAnnotationId?: string | null;
}

export const MapView = forwardRef<
  { setDrawMode: (enabled: boolean) => void },
  MapViewProps
>(function MapView(
  { ideas, center = DEFAULT_MAP_CENTER, tripId, highlightedAnnotationId },
  ref,
) {
  const { member } = useMember();
  const {
    annotations,
    cursors,
    broadcastCursor,
    onlineUsers,
    drawingPreviews,
    polygonPreviews,
    pathPreviews,
    broadcastDrawingStart,
    broadcastDrawingUpdate,
    broadcastDrawingEnd,
    broadcastPolygonPointAdded,
    broadcastPolygonPreviewUpdate,
    broadcastPolygonDrawingEnd,
    broadcastPathDrawingStart,
    broadcastPathDrawingUpdate,
    broadcastPathDrawingEnd,
  } = useRealtimeTrip(tripId, member);
  const {
    isSearching,
    progress,
    error: searchError,
    startSearch,
  } = useAreaSearch();

  // Filter out current user from online users
  const otherOnlineUsers = onlineUsers.filter((user) => {
    const isCurrentUser = user.id === member?.id;
    if (isCurrentUser) {
      console.log(
        "🔵 [MapView] Filtering out current user:",
        user.id,
        member?.id,
      );
    }
    return !isCurrentUser;
  });

  // Debug logging
  useEffect(() => {
    console.log(
      "🟢 [MapView] Online users:",
      onlineUsers.length,
      onlineUsers.map((u) => ({
        id: u.id,
        displayName: u.displayName || "No name",
      })),
    );
    console.log(
      "🟢 [MapView] Other online users:",
      otherOnlineUsers.length,
      otherOnlineUsers.map((u) => ({
        id: u.id,
        displayName: u.displayName || "No name",
      })),
    );
    console.log("🟢 [MapView] Current member:", {
      id: member?.id,
      displayName: member?.displayName || "No name",
    });
  }, [onlineUsers, otherOnlineUsers, member]);

  // Debug logging
  useEffect(() => {
    console.log(
      "🟢 [MapView] Online users:",
      onlineUsers.length,
      onlineUsers.map((u) => u.displayName || u.id),
    );
    console.log(
      "🟢 [MapView] Other online users:",
      otherOnlineUsers.length,
      otherOnlineUsers.map((u) => u.displayName || u.id),
    );
    console.log(
      "🟢 [MapView] Current member:",
      member?.id,
      member?.displayName,
    );
  }, [onlineUsers, otherOnlineUsers, member]);
  const [map, setMap] = useState<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const restoredFromStorageRef = useRef(false);
  const markersRef = useRef<L.Marker[]>([]);
  const rectanglesRef = useRef<L.Rectangle[]>([]);
  const polygonsRef = useRef<L.Polygon[]>([]);
  const annotationLabelsRef = useRef<L.Marker[]>([]);
  const pathDecorationsRef = useRef<L.Polyline[]>([]);
  const previewPolygonRef = useRef<L.Polygon | null>(null);
  const previewLineRef = useRef<L.Polyline | null>(null);
  const previewPathRef = useRef<L.Polyline | null>(null);
  const previewPointRefs = useRef<L.CircleMarker[]>([]);
  const previewRectRef = useRef<L.Rectangle | null>(null);
  const drawStartRef = useRef<L.LatLng | null>(null);
  const drawPointsRef = useRef<L.LatLng[]>([]);
  const isPathDrawingRef = useRef(false);
  const lastPathPointRef = useRef<L.LatLng | null>(null);

  // Area search overlay refs
  const searchOverlayRef = useRef<L.Rectangle | L.Polygon | null>(null);
  const searchLabelRef = useRef<L.Marker | null>(null);
  const [searchingBounds, setSearchingBounds] =
    useState<AnnotationCoordinates | null>(null);
  const [showSearchToast, setShowSearchToast] = useState(false);

  // Drawing State
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [drawTool, setDrawTool] = useState<"polygon" | "rect" | "path">(
    "polygon",
  );
  const [pendingAnnotation, setPendingAnnotation] =
    useState<AnnotationCoordinates | null>(null);
  const [panelPosition, setPanelPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [areaSize, setAreaSize] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  // Local drawing state for realtime annotation drawing
  const [localPreview, setLocalPreview] = useState<L.Rectangle | null>(null);
  const [selectedColor, setSelectedColor] = useState("#3B82F6"); // Default blue

  // Available colors for drawing
  const DRAWING_COLORS = [
    { value: "#3B82F6", label: "Blue" },
    { value: "#EF4444", label: "Red" },
    { value: "#10B981", label: "Green" },
    { value: "#F59E0B", label: "Yellow" },
    { value: "#8B5CF6", label: "Purple" },
  ];

  // Calculate panel position from annotation coordinates
  const calculatePanelPosition = (
    coordinates: AnnotationCoordinates,
    mapInstance: L.Map,
  ): { x: number; y: number } => {
    let centerLatLng: L.LatLng;

    if (coordinates.type === "polygon" || coordinates.type === "path") {
      const points = coordinates.points;
      const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
      const avgLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
      centerLatLng = L.latLng(avgLat, avgLng);
    } else {
      // Rectangle - use center
      const lat = (coordinates.north + coordinates.south) / 2;
      const lng = (coordinates.east + coordinates.west) / 2;
      centerLatLng = L.latLng(lat, lng);
    }

    const point = mapInstance.latLngToContainerPoint(centerLatLng);

    // Position to the right with offset, handling viewport bounds
    const panelWidth = 320;
    const offset = 30;
    const viewportWidth = window.innerWidth;

    let x = point.x + offset;

    // If panel would go off right edge, position to left instead
    if (x + panelWidth > viewportWidth) {
      x = point.x - panelWidth - offset;
    }

    // Ensure x is never negative
    x = Math.max(offset, x);

    return { x, y: point.y };
  };

  // Expose setDrawMode to parent via ref
  useImperativeHandle(ref, () => ({
    setDrawMode: (enabled: boolean) => {
      setIsDrawMode(enabled);
    },
  }));

  // Shared cleanup for pending annotation and preview layers (used by onClose and onSave)
  const clearPendingAnnotation = useCallback(() => {
    setPendingAnnotation(null);
    setPanelPosition(null);
    setAreaSize(null);
    setLocationName(null);
    if (previewLineRef.current) {
      previewLineRef.current.remove();
      previewLineRef.current = null;
    }
    if (previewPolygonRef.current) {
      previewPolygonRef.current.remove();
      previewPolygonRef.current = null;
    }
    if (previewRectRef.current) {
      previewRectRef.current.remove();
      previewRectRef.current = null;
    }
    if (previewPathRef.current) {
      previewPathRef.current.remove();
      previewPathRef.current = null;
    }
    localPreview?.remove();
    setLocalPreview(null);
  }, [localPreview]);

  // Clean up search overlay when area search completes
  const wasSearchingRef = useRef(false);
  useEffect(() => {
    if (wasSearchingRef.current && !isSearching) {
      // Search finished — remove pulsing overlay
      if (searchOverlayRef.current) {
        searchOverlayRef.current.remove();
        searchOverlayRef.current = null;
      }
      if (searchLabelRef.current) {
        searchLabelRef.current.remove();
        searchLabelRef.current = null;
      }
      setSearchingBounds(null);

      // Show success toast if no error
      if (!searchError) {
        setShowSearchToast(true);
        setTimeout(() => setShowSearchToast(false), 2500);
      }
    }
    wasSearchingRef.current = isSearching;
  }, [isSearching, searchError]);

  // Render pulsing search overlay on the drawn area while searching
  useEffect(() => {
    if (!map || !searchingBounds || !isSearching) return;

    // Remove any previous overlay
    searchOverlayRef.current?.remove();
    searchLabelRef.current?.remove();

    let centerLat: number;
    let centerLng: number;

    if (searchingBounds.type === "polygon") {
      const points = (searchingBounds as any).points || [];
      const latLngs = points.map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
      if (latLngs.length < 3) return;
      centerLat =
        points.reduce((s: number, p: any) => s + p.lat, 0) / points.length;
      centerLng =
        points.reduce((s: number, p: any) => s + p.lng, 0) / points.length;

      searchOverlayRef.current = L.polygon(latLngs, {
        color: "#3B82F6",
        weight: 2,
        fillOpacity: 0.15,
        className: "area-search-pulsing",
        interactive: false,
      }).addTo(map);
    } else {
      const coords = searchingBounds as any;
      centerLat = (coords.north + coords.south) / 2;
      centerLng = (coords.east + coords.west) / 2;

      searchOverlayRef.current = L.rectangle(
        [
          [coords.north, coords.west],
          [coords.south, coords.east],
        ],
        {
          color: "#3B82F6",
          weight: 2,
          fillOpacity: 0.15,
          className: "area-search-pulsing",
          interactive: false,
        },
      ).addTo(map);
    }

    // Animated text label at center
    const messages = [
      "Searching area...",
      "Finding places...",
      "Discovering spots...",
    ];
    const progressText = progress
      ? `Finding places... ${progress.current}/${progress.total}`
      : messages[Math.floor(Math.random() * messages.length)];

    searchLabelRef.current = L.marker([centerLat, centerLng], {
      icon: L.divIcon({
        className: "area-search-label-wrapper",
        html: `<div class="area-search-label"><span class="search-text">${progressText}</span></div>`,
        iconSize: [240, 40],
        iconAnchor: [120, 20],
      }),
      interactive: false,
    }).addTo(map);

    return () => {
      // Don't remove here — managed by the cleanup effect above
    };
  }, [map, searchingBounds, isSearching, progress]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || map) return;

    const savedViewKey = tripId ? `map-view-${tripId}` : null;
    let initialCenter = center;
    let initialZoom = DEFAULT_ZOOM;

    if (savedViewKey) {
      try {
        const saved = localStorage.getItem(savedViewKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          initialCenter = parsed.center;
          initialZoom = parsed.zoom;
          restoredFromStorageRef.current = true;
        }
      } catch {
        // Ignore parse/storage errors
      }
    }

    const mapInstance = L.map(mapContainerRef.current).setView(
      initialCenter,
      initialZoom,
    );

    L.tileLayer(TILE_LAYER_CONFIG.url, {
      attribution: TILE_LAYER_CONFIG.attribution,
      maxZoom: TILE_LAYER_CONFIG.maxZoom,
      minZoom: TILE_LAYER_CONFIG.minZoom,
    }).addTo(mapInstance);

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
      setMap(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist map view to localStorage on pan/zoom
  useEffect(() => {
    if (!map || !tripId) return;
    const key = `map-view-${tripId}`;

    const handleMoveEnd = () => {
      const c = map.getCenter();
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            center: [c.lat, c.lng],
            zoom: map.getZoom(),
          }),
        );
      } catch {
        // Ignore storage errors
      }
    };

    map.on("moveend", handleMoveEnd);
    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [map, tripId]);

  // Update Map Center
  useEffect(() => {
    if (map && !restoredFromStorageRef.current) {
      map.setView(center, map.getZoom());
    }
  }, [map, center]);

  // Handle Idea Markers
  useEffect(() => {
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const newMarkers: L.Marker[] = [];
    let bounds: L.LatLngBounds | null = null;

    ideas.forEach((idea) => {
      const { latitude, longitude } = idea;
      if (!latitude || !longitude) return;

      const location = idea.location as any;
      const confidence = location?.confidence || "medium";
      const icon = createMarkerIcon(
        idea.category,
        idea.icon_type || undefined,
        confidence,
      );
      const marker = L.marker([latitude, longitude], { icon });

      const popupContent = createPopupContent(
        idea.title || "Untitled",
        idea.summary || undefined,
        idea.tags || undefined,
        location,
        idea.cost_bucket || undefined,
        idea.duration_bucket || undefined,
        idea.category,
      );

      marker.bindPopup(popupContent);
      marker.addTo(map);
      newMarkers.push(marker);

      if (!bounds) {
        bounds = L.latLngBounds([[latitude, longitude]]);
      } else {
        bounds.extend([latitude, longitude]);
      }
    });

    markersRef.current = newMarkers;

    // Only fit bounds on initial load if we have ideas (optional)
    // We don't want to jump around if the user is panning
    // For now, we only fit if provided center hasn't been manually moved too much
    // (Skipping auto-fit logic to avoid fighting with realtime users)
  }, [map, ideas]);

  // Handle Annotation Shapes
  useEffect(() => {
    if (!map) return;

    // Clear old shapes and labels
    rectanglesRef.current.forEach((rect) => rect.remove());
    rectanglesRef.current = [];
    polygonsRef.current.forEach((poly) => poly.remove());
    polygonsRef.current = [];
    pathDecorationsRef.current.forEach((pl) => pl.remove());
    pathDecorationsRef.current = [];
    annotationLabelsRef.current.forEach((marker) => marker.remove());
    annotationLabelsRef.current = [];

    annotations.forEach((ann) => {
      const coords = ann.coordinates as any;
      if (!coords) return;

      const isHighlighted = ann.id === highlightedAnnotationId;
      const annColor = ann.color ?? NEUTRAL_ANNOTATION_COLOR;

      if (coords.type === "polygon" && Array.isArray(coords.points)) {
        const latLngs = coords.points
          .filter((point: any) => point && typeof point.lat === "number")
          .map((point: any) => [point.lat, point.lng] as L.LatLngTuple);

        if (latLngs.length < 3) return;

        const polygon = L.polygon(latLngs, {
          color: annColor,
          weight: isHighlighted ? 3 : 2.5,
          fillOpacity: isHighlighted ? 0.15 : 0.06,
          dashArray: isHighlighted ? undefined : "6, 4",
          className: isHighlighted ? "annotation-highlighted" : "",
        });

        polygon.addTo(map);
        polygonsRef.current.push(polygon);

        // Add frosted-glass label at centroid
        if (ann.label || (ann as any).name) {
          const avgLat =
            latLngs.reduce((sum, p) => sum + p[0], 0) / latLngs.length;
          const avgLng =
            latLngs.reduce((sum, p) => sum + p[1], 0) / latLngs.length;

          const labelMarker = L.marker([avgLat, avgLng], {
            icon: createAnnotationIcon(ann as any, isHighlighted),
            interactive: true,
          });
          labelMarker.addTo(map);
          annotationLabelsRef.current.push(labelMarker);
        }

        // Pan to highlighted annotation
        if (isHighlighted) {
          const bounds = polygon.getBounds();
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
        return;
      }

      if (coords.type === "path" && Array.isArray(coords.points)) {
        const latLngs = coords.points
          .filter((point: any) => point && typeof point.lat === "number")
          .map((point: any) => [point.lat, point.lng] as L.LatLngTuple);

        if (latLngs.length < 2) return;

        const polyline = L.polyline(latLngs, {
          color: annColor,
          weight: isHighlighted ? 3 : 2.5,
          opacity: isHighlighted ? 0.9 : 0.7,
          dashArray: isHighlighted ? undefined : "6, 4",
          className: isHighlighted ? "annotation-highlighted" : "",
        });

        polyline.addTo(map);
        pathDecorationsRef.current.push(polyline);

        // Add frosted-glass label at path midpoint
        if (ann.label || (ann as any).name) {
          const midIdx = Math.floor(latLngs.length / 2);
          const midPoint = latLngs[midIdx];

          const labelMarker = L.marker(midPoint, {
            icon: createAnnotationIcon(ann as any, isHighlighted),
            interactive: true,
          });
          labelMarker.addTo(map);
          annotationLabelsRef.current.push(labelMarker);
        }

        // Pan to highlighted annotation
        if (isHighlighted) {
          const bounds = polyline.getBounds();
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
        return;
      }

      if (
        typeof coords.north === "number" &&
        typeof coords.south === "number" &&
        typeof coords.east === "number" &&
        typeof coords.west === "number"
      ) {
        const bounds: L.LatLngBoundsExpression = [
          [coords.north, coords.west],
          [coords.south, coords.east],
        ];

        const rect = L.rectangle(bounds, {
          color: annColor,
          weight: isHighlighted ? 3 : 2.5,
          fillOpacity: isHighlighted ? 0.15 : 0.06,
          dashArray: isHighlighted ? undefined : "6, 4",
          className: isHighlighted ? "annotation-highlighted" : "",
        });

        rect.addTo(map);
        rectanglesRef.current.push(rect);

        // Add frosted-glass label at center
        if (ann.label || (ann as any).name) {
          const centerLat = (coords.north + coords.south) / 2;
          const centerLng = (coords.east + coords.west) / 2;

          const labelMarker = L.marker([centerLat, centerLng], {
            icon: createAnnotationIcon(ann as any, isHighlighted),
            interactive: true,
          });
          labelMarker.addTo(map);
          annotationLabelsRef.current.push(labelMarker);
        }

        // Pan to highlighted annotation
        if (isHighlighted) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
      }
    });
  }, [map, annotations, highlightedAnnotationId]);

  // Handle Drawing Logic
  useEffect(() => {
    if (!map) return;

    const container = map.getContainer();
    const closeThresholdPx = 12;

    const cleanupPreview = () => {
      if (previewLineRef.current) {
        previewLineRef.current.remove();
        previewLineRef.current = null;
      }
      if (previewPolygonRef.current) {
        previewPolygonRef.current.remove();
        previewPolygonRef.current = null;
      }
      if (previewRectRef.current) {
        previewRectRef.current.remove();
        previewRectRef.current = null;
      }
      if (previewPathRef.current) {
        previewPathRef.current.remove();
        previewPathRef.current = null;
      }
      previewPointRefs.current.forEach((marker) => marker.remove());
      previewPointRefs.current = [];
    };

    const resetDrawing = () => {
      cleanupPreview();
      drawPointsRef.current = [];
      drawStartRef.current = null;
      isPathDrawingRef.current = false;
      lastPathPointRef.current = null;
    };

    // New mouse event handlers for realtime annotation drawing
    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      if (!isDrawMode) return;

      if (drawTool === "path") {
        const startPoint = e.latlng;
        isPathDrawingRef.current = true;
        drawPointsRef.current = [startPoint];
        lastPathPointRef.current = startPoint;
        updatePreviewPath([startPoint]);
        broadcastPathDrawingStart(
          startPoint.lat,
          startPoint.lng,
          selectedColor,
        );
        return;
      }

      if (drawTool !== "rect") return;

      const { lat, lng } = e.latlng;
      drawStartRef.current = e.latlng;

      // Create local preview rectangle
      const preview = L.rectangle(
        [
          [lat, lng],
          [lat, lng],
        ],
        {
          color: selectedColor,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.1,
          dashArray: "5, 5",
          interactive: false,
        },
      );
      preview.addTo(map);
      setLocalPreview(preview);

      // Broadcast drawing start
      broadcastDrawingStart(lat, lng, selectedColor);
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      // 1. Broadcast Cursor Position (always, if provided)
      if (broadcastCursor) {
        broadcastCursor(e.latlng.lat, e.latlng.lng);
      }

      // 2. Handle Drawing Preview for polygon tool
      if (
        isDrawMode &&
        drawTool === "polygon" &&
        drawPointsRef.current.length > 0
      ) {
        updatePreviewLine([...drawPointsRef.current, e.latlng]);
        // Broadcast polygon preview update
        broadcastPolygonPreviewUpdate(e.latlng.lat, e.latlng.lng);
      }

      // 3. Handle Drawing Preview for rectangle tool (realtime)
      if (
        isDrawMode &&
        drawTool === "rect" &&
        drawStartRef.current &&
        localPreview
      ) {
        const { lat, lng } = e.latlng;

        // Update local preview
        const bounds = L.latLngBounds(drawStartRef.current, e.latlng);
        localPreview.setBounds(bounds);

        // Broadcast drawing update
        broadcastDrawingUpdate(lat, lng);
      }

      // 4. Handle Drawing Preview for path tool (realtime)
      if (
        isDrawMode &&
        drawTool === "path" &&
        isPathDrawingRef.current &&
        drawPointsRef.current.length > 0
      ) {
        const lastPoint = lastPathPointRef.current;
        const lastPointPx = lastPoint
          ? map.latLngToContainerPoint(lastPoint)
          : null;
        const currentPointPx = map.latLngToContainerPoint(e.latlng);
        const minDistancePx = 3;
        const distance = lastPointPx
          ? lastPointPx.distanceTo(currentPointPx)
          : minDistancePx;

        if (distance >= minDistancePx) {
          drawPointsRef.current = [...drawPointsRef.current, e.latlng];
          lastPathPointRef.current = e.latlng;
          updatePreviewPath(drawPointsRef.current);
          broadcastPathDrawingUpdate(e.latlng.lat, e.latlng.lng);
        }
      }
    };

    const handleMouseUp = async (e: L.LeafletMouseEvent) => {
      if (isDrawMode && drawTool === "path" && isPathDrawingRef.current) {
        const points = [...drawPointsRef.current];
        isPathDrawingRef.current = false;
        lastPathPointRef.current = null;

        if (points.length < 2) {
          resetDrawing();
          broadcastPathDrawingEnd(true);
          return;
        }

        const pathPoints = points.map((point) => ({
          lat: point.lat,
          lng: point.lng,
        }));

        // Paths are cosmetic — save directly without opening the modal
        if (tripId && member) {
          await supabase.from("trip_annotations" as any).insert({
            trip_id: tripId,
            created_by: member.id,
            coordinates: { type: "path", points: pathPoints },
            color: selectedColor,
            intent: "annotation",
            label: null,
            name: null,
          });
        }

        resetDrawing();
        broadcastPathDrawingEnd(false);
        return;
      }

      if (!isDrawMode || drawTool !== "rect" || !drawStartRef.current) return;

      const { lat, lng } = e.latlng;

      // Calculate bounds
      const bounds = {
        north: Math.max(drawStartRef.current.lat, lat),
        south: Math.min(drawStartRef.current.lat, lat),
        east: Math.max(drawStartRef.current.lng, lng),
        west: Math.min(drawStartRef.current.lng, lng),
      };

      // Validate minimum size
      const minSize = 0.0001;
      if (
        Math.abs(bounds.north - bounds.south) < minSize ||
        Math.abs(bounds.east - bounds.west) < minSize
      ) {
        // Too small, cancel
        localPreview?.remove();
        setLocalPreview(null);
        drawStartRef.current = null;
        broadcastDrawingEnd(true); // cancelled
        return;
      }

      // Broadcast drawing end
      broadcastDrawingEnd(false); // not cancelled

      // Calculate area size and get location name
      const annotationCoords = {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west,
        type: "box" as const,
      };

      const size = calculateAreaSize(annotationCoords);
      setAreaSize(size);

      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLng = (bounds.east + bounds.west) / 2;
      const location = await getNeighborhoodFromCoordinates(
        centerLat,
        centerLng,
      );
      setLocationName(location);

      // Open annotation modal (keep rectangle visible until save/close)
      setPendingAnnotation(annotationCoords);
      setPanelPosition(calculatePanelPosition(annotationCoords, map));

      // Reset drawing state; do not remove local preview yet (stays visible with modal)
      drawStartRef.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape" && isDrawMode) {
        if (drawTool === "rect" && drawStartRef.current) {
          // Cancel rectangle drawing
          localPreview?.remove();
          setLocalPreview(null);
          drawStartRef.current = null;
          broadcastDrawingEnd(true); // cancelled
        } else if (drawTool === "path" && isPathDrawingRef.current) {
          // Cancel path drawing
          resetDrawing();
          broadcastPathDrawingEnd(true);
        } else if (drawTool === "polygon" && drawPointsRef.current.length > 0) {
          // Cancel polygon drawing
          resetDrawing();
          broadcastPolygonDrawingEnd(true); // cancelled
        }
      }

      // R key → activate rectangle tool
      if (e.key === "r" || e.key === "R") {
        if (isDrawMode && drawTool === "rect") {
          // Already active — toggle off
          setIsDrawMode(false);
        } else {
          setDrawTool("rect");
          if (!isDrawMode) setIsDrawMode(true);
        }
      }

      // P key → activate polygon tool
      if (e.key === "p" || e.key === "P") {
        if (isDrawMode && drawTool === "polygon") {
          setIsDrawMode(false);
        } else {
          setDrawTool("polygon");
          if (!isDrawMode) setIsDrawMode(true);
        }
      }

      // ? key → open keyboard shortcuts modal
      if (e.key === "?") {
        setShowShortcuts(true);
      }
    };

    const updatePreviewPolygon = (points: L.LatLng[]) => {
      if (!previewPolygonRef.current) {
        previewPolygonRef.current = L.polygon(points, {
          color: selectedColor,
          weight: 2,
          fillOpacity: 0.1,
        }).addTo(map);
      } else {
        previewPolygonRef.current.setLatLngs(points);
      }

      previewPointRefs.current.forEach((marker) => marker.remove());
      previewPointRefs.current = points.map((point, index) =>
        L.circleMarker(point, {
          radius: index === 0 ? 6 : 4,
          color: index === 0 ? "#FFFFFF" : selectedColor,
          weight: index === 0 ? 3 : 2,
          fillColor: selectedColor,
          fillOpacity: 1,
        }).addTo(map),
      );
    };

    const updatePreviewLine = (points: L.LatLng[]) => {
      if (!previewLineRef.current) {
        previewLineRef.current = L.polyline(points, {
          color: selectedColor,
          weight: 2,
          dashArray: "5, 5",
        }).addTo(map);
        return;
      }

      previewLineRef.current.setLatLngs(points);
    };

    const updatePreviewPath = (points: L.LatLng[]) => {
      if (!previewPathRef.current) {
        previewPathRef.current = L.polyline(points, {
          color: selectedColor,
          weight: 2,
          opacity: 0.8,
        }).addTo(map);
        return;
      }

      previewPathRef.current.setLatLngs(points);
    };

    const finalizePolygon = async (points: L.LatLng[]) => {
      if (points.length < 3) {
        resetDrawing();
        // Broadcast polygon drawing cancelled
        broadcastPolygonDrawingEnd(true);
        return;
      }

      const annotationCoords = {
        type: "polygon" as const,
        points: points.map((point) => ({ lat: point.lat, lng: point.lng })),
      };

      // Calculate area size and get location name
      const size = calculateAreaSize(annotationCoords);
      setAreaSize(size);

      // Get center point for reverse geocoding
      const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
      const avgLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
      const location = await getNeighborhoodFromCoordinates(avgLat, avgLng);
      setLocationName(location);

      setPendingAnnotation(annotationCoords);
      setPanelPosition(calculatePanelPosition(annotationCoords, map));
      // Clear rubber-band line and point markers only; keep polygon visible until save/close
      if (previewLineRef.current) {
        previewLineRef.current.remove();
        previewLineRef.current = null;
      }
      previewPointRefs.current.forEach((marker) => marker.remove());
      previewPointRefs.current = [];
      drawPointsRef.current = [];

      // Broadcast polygon drawing completed
      broadcastPolygonDrawingEnd(false);
    };

    if (isDrawMode) {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      container.style.cursor = "crosshair";
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      container.style.cursor = "";
      resetDrawing();
    }

    const onClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawMode || drawTool !== "polygon") return;
      const clickCount =
        (e.originalEvent as MouseEvent | undefined)?.detail ?? 1;
      if (clickCount > 1) return;

      const points = drawPointsRef.current;
      if (points.length >= 3) {
        const firstPoint = points[0];
        const distance = map
          .latLngToContainerPoint(e.latlng)
          .distanceTo(map.latLngToContainerPoint(firstPoint));

        if (distance <= closeThresholdPx) {
          finalizePolygon(points);
          return;
        }
      }

      const nextPoints = [...points, e.latlng];
      drawPointsRef.current = nextPoints;
      updatePreviewPolygon(nextPoints);

      // Broadcast polygon point added
      broadcastPolygonPointAdded(
        nextPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
        selectedColor,
      );
    };

    const onDoubleClick = (e: L.LeafletMouseEvent) => {
      if (!isDrawMode || drawTool !== "polygon") return;
      if (drawPointsRef.current.length >= 3) {
        finalizePolygon(drawPointsRef.current);
      }
    };

    // Attach event listeners
    map.on("click", onClick);
    map.on("mousemove", handleMouseMove);
    map.on("dblclick", onDoubleClick);
    map.on("mousedown", handleMouseDown);
    map.on("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      map.off("click", onClick);
      map.off("mousemove", handleMouseMove);
      map.off("dblclick", onDoubleClick);
      map.off("mousedown", handleMouseDown);
      map.off("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    map,
    isDrawMode,
    drawTool,
    broadcastCursor,
    broadcastDrawingStart,
    broadcastDrawingUpdate,
    broadcastDrawingEnd,
    broadcastPolygonPointAdded,
    broadcastPolygonPreviewUpdate,
    localPreview,
    selectedColor,
    broadcastPathDrawingStart,
    broadcastPathDrawingUpdate,
    broadcastPathDrawingEnd,
  ]);

  return (
    <div className="relative h-full w-full group">
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Cursors Layer */}
      <MapCursorOverlay map={map} cursors={cursors} />

      {/* Drawing Previews Layer */}
      <MapDrawingOverlay map={map} drawingPreviews={drawingPreviews} />

      {/* Map Toolbar */}
      <MapToolbar
        onlineUsers={otherOnlineUsers}
        isDrawMode={isDrawMode}
        onDrawModeToggle={setIsDrawMode}
        drawTool={drawTool}
        onDrawToolChange={(tool) => {
          setDrawTool(tool);
          drawPointsRef.current = [];
          drawStartRef.current = null;
          isPathDrawingRef.current = false;
          lastPathPointRef.current = null;
        }}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        drawingColors={DRAWING_COLORS}
        onShortcutsOpen={() => setShowShortcuts(true)}
      />

      {/* Annotation Modal */}
      <AnnotationModal
        isOpen={!!pendingAnnotation}
        coordinates={pendingAnnotation}
        position={panelPosition}
        areaSize={areaSize}
        locationName={locationName}
        isSearching={false}
        searchProgress={null}
        searchError={null}
        onClose={clearPendingAnnotation}
        onSave={async (data) => {
          if (!pendingAnnotation || !tripId || !member) return;

          try {
            if (data.intent === "search_area") {
              // For AI search, convert polygon to bounding box if needed
              let searchBounds: {
                north: number;
                south: number;
                east: number;
                west: number;
              };

              if (pendingAnnotation.type === "polygon") {
                const points = (pendingAnnotation as any).points || [];
                const lats = points.map((p: any) => p.lat);
                const lngs = points.map((p: any) => p.lng);
                searchBounds = {
                  north: Math.max(...lats),
                  south: Math.min(...lats),
                  east: Math.max(...lngs),
                  west: Math.min(...lngs),
                };
              } else {
                searchBounds = pendingAnnotation as any;
              }

              // Store the search area for the pulsing overlay, then close modal immediately
              setSearchingBounds(pendingAnnotation);
              clearPendingAnnotation();
              setIsDrawMode(false);

              // Fire-and-forget: startSearch manages its own state via useAreaSearch
              startSearch(tripId, data.label, searchBounds);
              return;
            } else {
              // Save annotation to database
              const { error } = await supabase
                .from("trip_annotations" as any)
                .insert({
                  trip_id: tripId,
                  created_by: member.id,
                  coordinates: pendingAnnotation,
                  name: data.name,
                  label: data.label,
                  intent: data.intent,
                  color: data.color,
                });

              if (error) {
                console.error("Failed to save annotation:", error);
                alert("Failed to save annotation. Please try again.");
              }
            }
          } catch (error) {
            console.error("Error saving annotation:", error);
            alert("An error occurred. Please try again.");
          }

          clearPendingAnnotation();
          setIsDrawMode(false); // Exit draw mode after saving
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Search success toast */}
      {showSearchToast && (
        <div className="area-search-toast">✨ Places added to your map</div>
      )}

      {/* No ideas overlay (only if empty and not in draw mode) */}
      {ideas.length === 0 && !isDrawMode && annotations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none z-[300]">
          <div className="text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <p className="text-sm text-muted-foreground">
              Add ideas or draw on the map
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
