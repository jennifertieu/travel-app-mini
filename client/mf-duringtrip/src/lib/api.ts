import { supabase } from "./supabase";

export const BACKEND_URL =
  (import.meta.env.PUBLIC_BACKEND_URL as string | undefined) ?? "http://localhost:5001";

export const getApiUrl = (path: string): string =>
  `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export const buildAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
