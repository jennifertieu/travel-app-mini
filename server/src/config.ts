import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

export const PORT =
  process.env.PORT === "5000" ? "5001" : process.env.PORT || "5001";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});
