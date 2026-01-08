// Icon mapping utility for map markers
// Maps icon types to SVG path data for use in Leaflet markers

// SVG path data extracted from Lucide icons (24x24 viewBox, centered)
export const ICON_SVG_PATHS: Record<string, string> = {
  cafe: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
  restaurant: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3a2 2 0 0 0 2-2V9a5 5 0 0 0-5-5Z"/><path d="M21 15v7"/><path d="M3 15v7"/>',
  bar: '<path d="M8 22h8"/><path d="M7 2h10v20H7z"/><path d="M7 2v20"/><path d="M12 2v20"/><path d="M17 2v20"/>',
  museum: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7h18"/><path d="M3 11h18"/><path d="M3 15h18"/><path d="M3 19h18"/>',
  park: '<path d="M17 12H7l5-5 5 5z"/><path d="M17 12H7l5 5 5-5z"/><path d="M12 2v20"/>',
  beach: '<path d="M2 12h20"/><path d="M2 12c0 5.523 4.477 10 10 10s10-4.477 10-10"/><path d="M12 2c-2.5 0-4.5 2-4.5 4.5S9.5 11 12 11s4.5-2.5 4.5-5S14.5 2 12 2z"/>',
  temple: '<path d="M12 2v20"/><path d="M17 2v20"/><path d="M7 2v20"/><path d="M2 7h20"/><path d="M2 12h20"/><path d="M2 17h20"/>',
  market: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  hotel: '<path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M9 15h6"/>',
  shop: '<path d="M6 2v4"/><path d="M18 2v4"/><path d="M2 8h20"/><path d="M4 8v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 14h4"/>',
  landmark: '<path d="M3 20h18"/><path d="M6 20V8l6-4 6 4v12"/><path d="M9 12h6"/><path d="M9 16h6"/>',
  attraction: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  nature: '<path d="M12 2L2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3a2 2 0 0 0 2-2V9a5 5 0 0 0-5-5Z"/><path d="M21 15v7"/><path d="M3 15v7"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  other: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};

/**
 * Get the SVG path data for an icon type
 * Falls back to MapPin if icon type is not found
 */
export function getIconSvgPath(iconType?: string): string {
  if (!iconType) {
    return ICON_SVG_PATHS.other;
  }
  return ICON_SVG_PATHS[iconType.toLowerCase()] || ICON_SVG_PATHS.other;
}

/**
 * Get all available icon types
 */
export function getAvailableIconTypes(): string[] {
  return Object.keys(ICON_SVG_PATHS);
}

