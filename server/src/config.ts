import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Use port 5001 instead of 5000 to avoid conflict with macOS AirPlay
export const PORT = process.env.PORT === "5000" ? "5001" : (process.env.PORT || "5001");

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
