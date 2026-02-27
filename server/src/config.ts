import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

// Use PORT from environment (required for Render), default to 5001 for local dev
export const PORT = process.env.PORT || "5001";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
export const GOOGLE_MAPS_PLATFORM_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_API_KEY!;

// During-Trip Agent Configuration
export const DURING_TRIP_RATE_LIMIT = parseInt(
  process.env.DURING_TRIP_RATE_LIMIT || "20",
  10,
);
export const DURING_TRIP_CACHE_TTL = parseInt(
  process.env.DURING_TRIP_CACHE_TTL || "300",
  10,
);

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
