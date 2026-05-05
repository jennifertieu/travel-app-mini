import type { User, Session } from "@supabase/supabase-js";

/**
 * MemberProfile type mirrors the member_profiles table schema
 */
export interface MemberProfile {
  id: string;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  dietary: string[] | null;
  interests: string[] | null;
  travel_style: string | null;
  walking_tolerance: string | null;
  hometown?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * AuthContextValue provides authentication state and methods to components
 */
export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: MemberProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}
