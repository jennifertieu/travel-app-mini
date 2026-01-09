/**
 * Unfurling utilities for extracting metadata from social media URLs
 * Supports TikTok and YouTube Shorts
 */
export interface UnfurlData {
    title: string;
    description?: string;
    thumbnail: string;
    platform: "tiktok" | "youtube";
    embedHtml?: string;
    iframeUrl?: string;
    creator?: string;
}
/**
 * Detects platform from URL
 */
export declare function detectPlatform(url: string): "tiktok" | "youtube" | null;
/**
 * Normalizes URL to ensure proper format
 */
export declare function normalizeUrl(url: string): string;
/**
 * Main unfurling function that extracts metadata from social media URLs
 * @param url - The social media URL to unfurl
 * @returns UnfurlData with extracted metadata, or null if unfurling fails
 */
export declare function unfurlUrl(url: string): Promise<UnfurlData | null>;
/**
 * Validates if a URL can be unfurled
 */
export declare function canUnfurlUrl(url: string): boolean;
