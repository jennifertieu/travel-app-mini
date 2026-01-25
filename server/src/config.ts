import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

// Use port 5001 instead of 5000 to avoid conflict with macOS AirPlay
export const PORT =
  process.env.PORT === "5000" ? "5001" : process.env.PORT || "5001";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const GOOGLE_MAPS_PLATFORM_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_API_KEY!;

// During-Trip Agent Configuration
export const DURING_TRIP_RATE_LIMIT = parseInt(
  process.env.DURING_TRIP_RATE_LIMIT || "20",
  10
);
export const DURING_TRIP_CACHE_TTL = parseInt(
  process.env.DURING_TRIP_CACHE_TTL || "300",
  10
);

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});
