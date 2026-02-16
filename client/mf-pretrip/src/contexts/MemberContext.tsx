import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

export interface MemberProfile {
  id: string;
  displayName?: string;
  dietary: string[];
  travelStyle: "chill" | "balanced" | "packed";
  interests: string[];
  walkingTolerance?: "low" | "medium" | "high";
}

interface MemberContextValue {
  member: MemberProfile;
  updateMember: (updates: Partial<MemberProfile>) => void;
  isInitialized: boolean;
}

const MemberContext = createContext<MemberContextValue | undefined>(undefined);

export function MemberProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeMember();
  }, []);

  const initializeMember = async () => {
    try {
      // Get the authenticated user from Supabase Auth
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("No authenticated user found:", authError);
        setIsInitialized(true);
        return;
      }

      console.log("Loading profile for authenticated user:", user.id);

      // Load profile from Supabase using the auth user's ID
      const { data, error } = await supabase
        .from("member_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.warn("Profile not found, creating it...", error);

        // Create profile with name from auth metadata
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";

        const { data: newProfile, error: insertError } = await supabase
          .from("member_profiles")
          .insert({
            id: user.id,
            user_id: user.id,
            display_name: displayName,
            dietary: [],
            travel_style: "balanced",
            interests: [],
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to create profile:", insertError);
          setIsInitialized(true);
          return;
        }

        const profile: MemberProfile = {
          id: newProfile.id,
          displayName: newProfile.display_name || undefined,
          dietary: newProfile.dietary || [],
          travelStyle: (newProfile.travel_style as any) || "balanced",
          interests: newProfile.interests || [],
          walkingTolerance: (newProfile.walking_tolerance as any) || undefined,
        };
        setMember(profile);
      } else {
        const profile: MemberProfile = {
          id: data.id,
          displayName: data.display_name || undefined,
          dietary: data.dietary || [],
          travelStyle: (data.travel_style as any) || "balanced",
          interests: data.interests || [],
          walkingTolerance: (data.walking_tolerance as any) || undefined,
        };
        setMember(profile);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error("Error initializing member:", error);
      setIsInitialized(true);
    }
  };

  const updateMember = async (updates: Partial<MemberProfile>) => {
    if (!member) return;

    const updatedMember = { ...member, ...updates };
    setMember(updatedMember);

    // Update in Supabase
    const { error } = await supabase
      .from("member_profiles")
      .update({
        display_name: updatedMember.displayName,
        dietary: updatedMember.dietary,
        travel_style: updatedMember.travelStyle,
        interests: updatedMember.interests,
        walking_tolerance: updatedMember.walkingTolerance,
      })
      .eq("id", member.id);

    if (error) {
      console.error("Error updating member profile:", error);
    }
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  // If no member after initialization, user is not authenticated
  if (!member) {
    return <div>Please log in to continue</div>;
  }

  return (
    <MemberContext.Provider value={{ member, updateMember, isInitialized }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const context = useContext(MemberContext);
  if (context === undefined) {
    throw new Error("useMember must be used within a MemberProvider");
  }
  return context;
}
