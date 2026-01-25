import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { AuthContextValue, MemberProfile } from "../types/auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Ensures a member_profile exists for the authenticated user.
   * Creates a new profile if one doesn't exist.
   */
  const ensureProfile = async (userId: string, userData: User) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from("member_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 is "no rows returned" - that's expected for new users
        console.error("Error fetching profile:", fetchError);
        return null;
      }

      if (existingProfile) {
        setProfile(existingProfile);
        return existingProfile;
      }

      // Create new profile for first-time user
      const displayName =
        userData.user_metadata?.full_name ||
        userData.user_metadata?.name ||
        userData.email?.split("@")[0] ||
        "User";

      const { data: newProfile, error: insertError } = await supabase
        .from("member_profiles")
        .insert({
          id: userId, // Use auth user_id as profile id
          user_id: userId,
          display_name: displayName,
          dietary: [],
          interests: [],
          travel_style: null,
          walking_tolerance: null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating profile:", insertError);
        return null;
      }

      setProfile(newProfile);
      return newProfile;
    } catch (error) {
      console.error("Unexpected error in ensureProfile:", error);
      return null;
    }
  };

  /**
   * Initiates Google OAuth sign-in flow
   */
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/pretrip`,
        },
      });

      if (error) {
        console.error("Error signing in with Google:", error);
        throw error;
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  /**
   * Signs out the current user
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        throw error;
      }

      // Clear state
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        ensureProfile(session.user.id, session.user).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await ensureProfile(session.user.id, session.user);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
