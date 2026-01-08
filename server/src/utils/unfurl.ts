import { detectPlatform, normalizeUrl } from "./utils.js";

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
 * Extracts video ID from TikTok URL
 */
function extractTikTokVideoId(url: string): string | null {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);

    const videoMatch = urlObj.pathname.match(/\/video\/(\d+)/);
    if (videoMatch) {
      return videoMatch[1];
    }

    const shortMatch = urlObj.pathname.match(/^\/([A-Za-z0-9]+)\/?$/);
    if (
      shortMatch &&
      (urlObj.hostname.includes("vm.tiktok.com") ||
        urlObj.hostname.includes("vt.tiktok.com"))
    ) {
      return shortMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts video ID from YouTube Shorts URL
 */
function extractYouTubeVideoId(url: string): string | null {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);

    const shortsMatch = urlObj.pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/);
    if (shortsMatch) {
      return shortsMatch[1];
    }

    const shortMatch = urlObj.pathname.match(/^\/([A-Za-z0-9_-]+)/);
    if (shortMatch && urlObj.hostname.includes("youtu.be")) {
      return shortMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generates a TikTok embed iframe HTML
 */
function generateTikTokEmbed(url: string): string {
  return `<blockquote class="tiktok-embed" cite="${url}" data-unique-id="tiktok-embed"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`;
}

/**
 * Generates a YouTube Shorts embed iframe HTML
 */
function generateYouTubeEmbed(videoId: string): string {
  return `<iframe width="325" height="580" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

/**
 * Generates a TikTok iframe URL for embedding
 */
function generateTikTokIframeUrl(url: string): string {
  return url;
}

/**
 * Generates a YouTube Shorts iframe URL for embedding
 */
function generateYouTubeIframeUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Generates a TikTok thumbnail URL
 */
function generateTikTokThumbnail(videoId: string): string {
  return `https://via.placeholder.com/325x580?text=TikTok+Video`;
}

/**
 * Generates a YouTube Shorts thumbnail URL
 */
function generateYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Extracts creator/username from TikTok URL
 */
function extractTikTokCreator(url: string): string | null {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);

    const creatorMatch = urlObj.pathname.match(/@([^/]+)/);
    if (creatorMatch) {
      return creatorMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generates a title for TikTok content
 */
function generateTikTokTitle(creator: string | null): string {
  if (creator) {
    return `TikTok video by @${creator}`;
  }
  return "TikTok video";
}

/**
 * Generates a title for YouTube Shorts content
 */
function generateYouTubeTitle(): string {
  return "YouTube Shorts video";
}

/**
 * Fetches TikTok metadata using oEmbed API
 */
async function fetchTikTokMetadata(url: string): Promise<{
  title: string;
  description?: string;
  thumbnail: string;
  creator?: string;
} | null> {
  try {
    console.log("🔍 [Unfurl] Fetching TikTok metadata via oEmbed...");

    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(
      url
    )}`;
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      console.warn("⚠️ [Unfurl] TikTok oEmbed failed, using fallback");
      return null;
    }

    const data = await response.json();
    console.log("✅ [Unfurl] TikTok metadata fetched:", {
      title: data.title?.substring(0, 50),
      author: data.author_name,
    });

    return {
      title: data.title || "TikTok video",
      description: data.title,
      thumbnail: data.thumbnail_url || generateTikTokThumbnail(""),
      creator: data.author_name || extractTikTokCreator(url) || undefined,
    };
  } catch (error) {
    console.error("❌ [Unfurl] Error fetching TikTok metadata:", error);
    return null;
  }
}

/**
 * Fetches YouTube metadata using oEmbed API
 */
async function fetchYouTubeMetadata(videoId: string): Promise<{
  title: string;
  description?: string;
  thumbnail: string;
  creator?: string;
} | null> {
  try {
    console.log("🔍 [Unfurl] Fetching YouTube metadata via oEmbed...");

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      url
    )}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      console.warn("⚠️ [Unfurl] YouTube oEmbed failed, using fallback");
      return null;
    }

    const data = await response.json();
    console.log("✅ [Unfurl] YouTube metadata fetched:", {
      title: data.title?.substring(0, 50),
      author: data.author_name,
    });

    return {
      title: data.title || "YouTube Shorts video",
      description: data.title,
      thumbnail: data.thumbnail_url || generateYouTubeThumbnail(videoId),
      creator: data.author_name || undefined,
    };
  } catch (error) {
    console.error("❌ [Unfurl] Error fetching YouTube metadata:", error);
    return null;
  }
}

/**
 * Main unfurling function that extracts metadata from social media URLs
 */
export async function unfurlUrl(url: string): Promise<UnfurlData | null> {
  try {
    const platform = detectPlatform(url);

    if (!platform) {
      return null;
    }

    if (platform === "tiktok") {
      const videoId = extractTikTokVideoId(url);
      if (!videoId) {
        return null;
      }

      const metadata = await fetchTikTokMetadata(url);

      const creator =
        metadata?.creator || extractTikTokCreator(url) || undefined;
      const title = metadata?.title || generateTikTokTitle(creator || null);
      const description = metadata?.description;
      const thumbnail = metadata?.thumbnail || generateTikTokThumbnail(videoId);
      const embedHtml = generateTikTokEmbed(url);
      const iframeUrl = generateTikTokIframeUrl(url);

      return {
        title,
        description,
        thumbnail,
        platform: "tiktok",
        embedHtml,
        iframeUrl,
        creator,
      };
    }

    if (platform === "youtube") {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        return null;
      }

      const metadata = await fetchYouTubeMetadata(videoId);

      const title = metadata?.title || generateYouTubeTitle();
      const description = metadata?.description;
      const thumbnail =
        metadata?.thumbnail || generateYouTubeThumbnail(videoId);
      const embedHtml = generateYouTubeEmbed(videoId);
      const iframeUrl = generateYouTubeIframeUrl(videoId);

      return {
        title,
        description,
        thumbnail,
        platform: "youtube",
        embedHtml,
        iframeUrl,
        creator: metadata?.creator,
      };
    }

    return null;
  } catch (error) {
    console.error("❌ [Unfurl] Error unfurling URL:", error);
    return null;
  }
}

/**
 * Validates if a URL can be unfurled
 */
export function canUnfurlUrl(url: string): boolean {
  const platform = detectPlatform(url);
  if (!platform) return false;

  if (platform === "tiktok") {
    return extractTikTokVideoId(url) !== null;
  }

  if (platform === "youtube") {
    return extractYouTubeVideoId(url) !== null;
  }

  return false;
}
