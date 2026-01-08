import { createClient } from "@supabase/supabase-js";
import { Database } from "@travel-app/shared-types";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "CRITICAL ERROR: Supabase URL or Key is missing in environment variables!"
  );
  if (!supabaseUrl) console.error("Missing: SUPABASE_URL");
  if (!supabaseKey)
    console.error("Missing: SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY");
}

// We only create the client if we have the required values to prevent crashing on import
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient<Database>(supabaseUrl, supabaseKey)
    : (null as any);
