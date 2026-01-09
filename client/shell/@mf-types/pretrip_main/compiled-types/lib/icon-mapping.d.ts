export declare const ICON_SVG_PATHS: Record<string, string>;
/**
 * Get the SVG path data for an icon type
 * Falls back to MapPin if icon type is not found
 */
export declare function getIconSvgPath(iconType?: string): string;
/**
 * Get all available icon types
 */
export declare function getAvailableIconTypes(): string[];
