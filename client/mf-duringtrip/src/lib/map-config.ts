import L from "leaflet";
import { getIconSvgPath, getCategoryColor } from "./icon-mapping";

export const DEFAULT_MAP_CENTER: [number, number] = [40.7128, -74.006]; // NYC
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 18;

export const TILE_LAYER_CONFIG = {
  url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: MAX_ZOOM,
  minZoom: MIN_ZOOM,
};

export const createMarkerIcon = (
  category?: string | null,
  iconType?: string,
  confidence?: "low" | "medium" | "high",
  status?: "past" | "current" | "upcoming",
) => {
  const colorConfig = getCategoryColor(category);
  const isPast = status === "past";
  const isCurrent = status === "current";
  const fill = isPast ? "#9CA3AF" : colorConfig.fill;
  const iconPath = getIconSvgPath(iconType || category || undefined);
  const opacity = isPast ? "0.5" : "1";

  return L.divIcon({
    html: `
      <div class="map-pin-marker" style="opacity:${opacity};position:relative;">
        ${
          isCurrent
            ? `<div style="
                position:absolute;top:-6px;left:-6px;width:52px;height:52px;
                border-radius:50%;
                border:3px solid #0D9488;
                animation:marker-pulse 2s ease-out infinite;
                pointer-events:none;
              "></div>
              <style>
                @keyframes marker-pulse {
                  0% { transform:scale(1); opacity:1; }
                  100% { transform:scale(1.6); opacity:0; }
                }
              </style>`
            : ""
        }
        <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2C11.163 2 4 9.163 4 18C4 26 20 48 20 48C20 48 36 26 36 18C36 9.163 28.837 2 20 2Z"
                fill="${fill}"
                stroke="${isCurrent ? "#0D9488" : "white"}"
                stroke-width="${isCurrent ? "3" : "2.5"}"/>
          <circle cx="20" cy="17" r="10" fill="white"/>
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

export const createPopupContent = (
  title: string,
  description?: string,
): string => {
  return `
    <div style="max-width:220px;font-family:system-ui,-apple-system,sans-serif;">
      <h3 style="font-weight:600;font-size:13px;margin:0;line-height:1.3;color:#111827;">${title}</h3>
      ${description ? `<p style="font-size:11px;color:#6b7280;margin:4px 0 0;line-height:1.4;">${description.substring(0, 100)}${description.length > 100 ? "..." : ""}</p>` : ""}
    </div>
  `;
};
