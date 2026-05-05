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
      console.log("Checking profile for user:", userId);

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

      const avatarUrl =
        userData.user_metadata?.avatar_url ||
        userData.user_metadata?.picture ||
        null;

      if (existingProfile) {
        console.log("Profile found:", existingProfile);
        // Sync avatar from Google in case it changed
        if (avatarUrl && existingProfile.avatar_url !== avatarUrl) {
          const { data: updatedProfile } = await supabase
            .from("member_profiles")
            .update({ avatar_url: avatarUrl })
            .eq("user_id", userId)
            .select()
            .single();
          const merged = updatedProfile ?? existingProfile;
          setProfile(merged);
          return merged;
        }
        setProfile(existingProfile);
        return existingProfile;
      }

      console.log("No profile found, creating new profile...");

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
          avatar_url: avatarUrl,
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

      console.log("Profile created:", newProfile);
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
          redirectTo: window.location.href,
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
    // Get initial session with timeout and error handling
    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          setLoading(false);
          return;
        }

        console.log(
          "Session retrieved:",
          session ? "authenticated" : "not authenticated",
        );
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log("Ensuring profile for user:", session.user.id);
          // Don't let profile creation block the auth flow
          ensureProfile(session.user.id, session.user).catch((error) => {
            console.error(
              "Profile creation failed, but continuing with auth:",
              error,
            );
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("Unexpected error during auth initialization:", error);
        setLoading(false);
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn("Auth initialization timed out, setting loading to false");
      setLoading(false);
    }, 5000); // 5 second timeout

    initializeAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "Auth state changed:",
        event,
        session ? "authenticated" : "not authenticated",
      );
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Don't let profile creation block the auth flow
        ensureProfile(session.user.id, session.user).catch((error) => {
          console.error("Profile creation failed during auth change:", error);
        });
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Expose session to remotes (e.g. mf-itinerary) so their Supabase client can set it for RLS
  useEffect(() => {
    (
      window as unknown as { __TRIPWEAVE_SESSION__?: Session | null }
    ).__TRIPWEAVE_SESSION__ = session ?? null;
  }, [session]);

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
