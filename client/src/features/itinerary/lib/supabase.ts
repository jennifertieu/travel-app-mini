import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://imzyqjkdbxeubmmmwlyk.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltenlxamtkYnhldWJtbW13bHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjE5OTQsImV4cCI6MjA4MzAzNzk5NH0.KdSd7_eTpsol3OVOFsGhiYpwd22XzBQDbmUR30KXYrs";

// Debug: which Supabase project this MF is using (helps diagnose "different account" / Realtime issues)
const usingEnv = !!(
  (
    import.meta as unknown as {
      env?: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string };
    }
  ).env?.VITE_SUPABASE_URL &&
  (import.meta as unknown as { env?: { VITE_SUPABASE_ANON_KEY?: string } }).env
    ?.VITE_SUPABASE_ANON_KEY
);
export const isUsingFallbackSupabase = !usingEnv;

if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
  const projectRef =
    supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "unknown";
  console.log("[mf-itinerary] Supabase:", {
    url: supabaseUrl,
    projectRef,
    source: usingEnv ? ".env.local (or env)" : "fallback (hardcoded)",
  });
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
