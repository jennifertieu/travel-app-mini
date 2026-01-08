// Re-export Supabase types
export * from "./database.types";

// Shared utility types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
