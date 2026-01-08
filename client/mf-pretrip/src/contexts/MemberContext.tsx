import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateUUID } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface MemberProfile {
  id: string;
  displayName?: string;
  dietary: string[];
  travelStyle: 'chill' | 'balanced' | 'packed';
  interests: string[];
  walkingTolerance?: 'low' | 'medium' | 'high';
}

interface MemberContextValue {
  member: MemberProfile;
  updateMember: (updates: Partial<MemberProfile>) => void;
  isInitialized: boolean;
}

const MemberContext = createContext<MemberContextContextValue | undefined>(undefined);

const STORAGE_KEY = 'travel-app-member-id';
const PROFILE_STORAGE_KEY = 'travel-app-member-profile';

export function MemberProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeMember();
  }, []);

  const initializeMember = async () => {
    try {
      // Try to get existing member ID from localStorage
      let memberId = localStorage.getItem(STORAGE_KEY);
      
      if (!memberId) {
        // Generate new member ID
        memberId = generateUUID();
        localStorage.setItem(STORAGE_KEY, memberId);
        
        // Create member profile in Supabase
        const { error } = await supabase
          .from('member_profiles')
          .insert({
            id: memberId,
            dietary: [],
            travel_style: 'balanced',
            interests: [],
          });
        
        if (error) {
          console.error('Error creating member profile:', error);
        }
      }

      // Try to load profile from localStorage
      const storedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedProfile) {
        try {
          const profile = JSON.parse(storedProfile);
          setMember(profile);
          setIsInitialized(true);
          return;
        } catch (e) {
          console.error('Error parsing stored profile:', e);
        }
      }

      // Load profile from Supabase
      const { data, error } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) {
        console.warn('Profile not found in Supabase, creating it...', error);
        
        // Create the missing profile in Supabase
        const { error: insertError } = await supabase
          .from('member_profiles')
          .upsert({
            id: memberId,
            dietary: [],
            travel_style: 'balanced',
            interests: [],
          });

        if (insertError) {
          console.error('Failed to create missing profile:', insertError);
        }

        // Create default profile for state
        const defaultProfile: MemberProfile = {
          id: memberId,
          dietary: [],
          travelStyle: 'balanced',
          interests: [],
        };
        setMember(defaultProfile);
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(defaultProfile));
      } else {
        const profile: MemberProfile = {
          id: data.id,
          displayName: data.display_name || undefined,
          dietary: data.dietary || [],
          travelStyle: (data.travel_style as any) || 'balanced',
          interests: data.interests || [],
          walkingTolerance: (data.walking_tolerance as any) || undefined,
        };
        setMember(profile);
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing member:', error);
      // Create emergency fallback profile
      const fallbackId = generateUUID();
      const fallbackProfile: MemberProfile = {
        id: fallbackId,
        dietary: [],
        travelStyle: 'balanced',
        interests: [],
      };
      setMember(fallbackProfile);
      localStorage.setItem(STORAGE_KEY, fallbackId);
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(fallbackProfile));
      setIsInitialized(true);
    }
  };

  const updateMember = async (updates: Partial<MemberProfile>) => {
    if (!member) return;

    const updatedMember = { ...member, ...updates };
    setMember(updatedMember);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedMember));

    // Update in Supabase
    const { error } = await supabase
      .from('member_profiles')
      .update({
        display_name: updatedMember.displayName,
        dietary: updatedMember.dietary,
        travel_style: updatedMember.travelStyle,
        interests: updatedMember.interests,
        walking_tolerance: updatedMember.walkingTolerance,
      })
      .eq('id', member.id);

    if (error) {
      console.error('Error updating member profile:', error);
    }
  };

  if (!member) {
    return <div>Loading...</div>;
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
    throw new Error('useMember must be used within a MemberProvider');
  }
  return context;
}

