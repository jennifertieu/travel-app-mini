/**
 * API Configuration
 *
 * Centralized configuration for backend API calls.
 * Uses environment variables to support both development and production.
 */

// Backend API base URL
// Development: http://localhost:5001
// Production: Set PUBLIC_BACKEND_URL to your deployed backend URL
export const BACKEND_URL =
  import.meta.env.PUBLIC_BACKEND_URL || "http://localhost:5001";

/**
 * Create a full API URL from a path
 * @param path - API endpoint path (e.g., "/enrich", "/suggestions/generate")
 * @returns Full API URL
 */
export function createApiUrl(path: string): string {
  return `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Common fetch options for API calls
 */
export const defaultFetchOptions: RequestInit = {
  headers: {
    "Content-Type": "application/json",
  },
};
