import L from "leaflet";

export interface Annotation {
  id: string;
  trip_id: string;
  created_by: string;
  coordinates: Record<string, unknown>;
  label: string | null;
  intent: string | null;
  color: string | null;
  name?: string | null;
  created_at: string;
}

const COLOR_ICON_MAP: Record<string, string> = {
  "#3B82F6": "\u{1F3E8}",
  "#EF4444": "\u2B50",
  "#10B981": "\u{1F333}",
  "#F59E0B": "\u{1F37D}\uFE0F",
  "#8B5CF6": "\u{1F389}",
};

const NEUTRAL_ANNOTATION_COLOR = "#6B7280";

export function escapeAnnotationHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const LABEL_ZOOM_THRESHOLD = 13;

export function createAnnotationIcon(
  ann: {
    color?: string | null;
    label?: string | null;
    intent?: string | null;
    name?: string | null;
  },
  isHighlighted: boolean,
  zoom: number = LABEL_ZOOM_THRESHOLD,
): L.DivIcon {
  const color = ann.color ?? NEUTRAL_ANNOTATION_COLOR;
  const icon =
    ann.intent === "search_area"
      ? "\u{1F50D}"
      : ann.color
        ? COLOR_ICON_MAP[ann.color] || "\u{1F4DD}"
        : "\u{1F4DD}";

  const showText = zoom >= LABEL_ZOOM_THRESHOLD;

  const displayName = ann.name || ann.label || "";
  const safeName = showText
    ? escapeAnnotationHtml(
        displayName.length > 24
          ? displayName.slice(0, 24) + "\u2026"
          : displayName,
      )
    : "";

  const labelText = ann.label || "";
  const safeLabel =
    showText && labelText
      ? escapeAnnotationHtml(
          labelText.length > 40 ? labelText.slice(0, 40) + "\u2026" : labelText,
        )
      : "";
  const highlightedClass = isHighlighted ? " highlighted" : "";

  return L.divIcon({
    className: "map-annotation-icon",
    html: `
      <div class="map-annotation-card${highlightedClass}" style="--annotation-color: ${color};">
        <div class="ann-header">
          <span class="ann-icon">${icon}</span>
          ${safeName ? `<span class="ann-title">${safeName}</span>` : ""}
        </div>
        ${safeLabel ? `<div class="ann-note">${safeLabel}</div>` : ""}
      </div>
    `,
    iconSize: undefined as any,
    iconAnchor: [0, 0],
  });
}

export function renderAnnotations(
  map: L.Map,
  annotations: Annotation[],
  layerGroup: L.LayerGroup,
): void {
  layerGroup.clearLayers();
  const zoom = map.getZoom();

  for (const ann of annotations) {
    const coords = ann.coordinates as any;
    if (!coords) continue;

    const annColor = ann.color ?? NEUTRAL_ANNOTATION_COLOR;

    // Polygon
    if (coords.type === "polygon" && Array.isArray(coords.points)) {
      const latLngs = coords.points
        .filter((p: any) => p && typeof p.lat === "number")
        .map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
      if (latLngs.length < 3) continue;

      const polygon = L.polygon(latLngs, {
        color: annColor,
        weight: 2.5,
        fillOpacity: 0.06,
        dashArray: "6, 4",
      });
      layerGroup.addLayer(polygon);

      if (ann.label || ann.name) {
        const avgLat =
          latLngs.reduce((s: number, p: L.LatLngTuple) => s + p[0], 0) /
          latLngs.length;
        const avgLng =
          latLngs.reduce((s: number, p: L.LatLngTuple) => s + p[1], 0) /
          latLngs.length;
        layerGroup.addLayer(
          L.marker([avgLat, avgLng], {
            icon: createAnnotationIcon(ann as any, false, zoom),
            interactive: true,
          }),
        );
      }
      continue;
    }

    // Path
    if (coords.type === "path" && Array.isArray(coords.points)) {
      const latLngs = coords.points
        .filter((p: any) => p && typeof p.lat === "number")
        .map((p: any) => [p.lat, p.lng] as L.LatLngTuple);
      if (latLngs.length < 2) continue;

      const polyline = L.polyline(latLngs, {
        color: annColor,
        weight: 2.5,
        opacity: 0.7,
        dashArray: "6, 4",
      });
      layerGroup.addLayer(polyline);

      if (ann.label || ann.name) {
        const midIdx = Math.floor(latLngs.length / 2);
        layerGroup.addLayer(
          L.marker(latLngs[midIdx], {
            icon: createAnnotationIcon(ann as any, false, zoom),
            interactive: true,
          }),
        );
      }
      continue;
    }

    // Rectangle
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
        weight: 2.5,
        fillOpacity: 0.06,
        dashArray: "6, 4",
      });
      layerGroup.addLayer(rect);

      if (ann.label || ann.name) {
        const centerLat = (coords.north + coords.south) / 2;
        const centerLng = (coords.east + coords.west) / 2;
        layerGroup.addLayer(
          L.marker([centerLat, centerLng], {
            icon: createAnnotationIcon(ann as any, false, zoom),
            interactive: true,
          }),
        );
      }
    }
  }
}
