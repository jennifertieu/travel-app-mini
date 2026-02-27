export const BACKEND_URL =
  (import.meta.env.PUBLIC_BACKEND_URL as string | undefined) ??
  "http://localhost:5001";

export const getApiUrl = (path: string): string =>
  `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;
