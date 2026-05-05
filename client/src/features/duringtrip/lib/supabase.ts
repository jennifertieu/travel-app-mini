import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types";

const supabaseUrl =
  import.meta.env.PUBLIC_SUPABASE_URL ||
  "https://imzyqjkdbxeubmmmwlyk.supabase.co";
const supabaseAnonKey =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltenlxamtkYnhldWJtbW13bHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjE5OTQsImV4cCI6MjA4MzAzNzk5NH0.KdSd7_eTpsol3OVOFsGhiYpwd22XzBQDbmUR30KXYrs";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
