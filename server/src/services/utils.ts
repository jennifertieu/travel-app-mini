/**
 * Normalizes a URL by adding https:// if missing and handling various formats
 */
export function normalizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  // If it already has a protocol, return as is
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // If it starts with //, add https:
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  // Otherwise, add https://
  return `https://${trimmed}`;
}

/**
 * Detects the platform type from a social media URL
 */
export function detectPlatform(url: string): "tiktok" | "youtube" | null {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname.toLowerCase();

    // TikTok detection
    if (hostname.includes("tiktok.com") || hostname.includes("vm.tiktok.com")) {
      return "tiktok";
    }

    // YouTube Shorts detection
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      // Accept /shorts/ URLs or youtu.be URLs (commonly used for Shorts)
      if (
        normalizedUrl.includes("/shorts/") ||
        urlObj.pathname.includes("/shorts/") ||
        hostname.includes("youtu.be")
      ) {
        return "youtube";
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validates if a URL is a supported social media platform
 */
export function isValidSocialMediaUrl(url: string): boolean {
  return detectPlatform(url) !== null;
}
