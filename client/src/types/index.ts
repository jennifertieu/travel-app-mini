// Re-export Supabase types
export * from "./database.types";

// Re-export itinerary types (canonical source)
export * from "@/features/itinerary/types";

// Shared utility types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
