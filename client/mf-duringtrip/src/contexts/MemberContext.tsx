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
  isInitialized: boolean;
}

const MemberContext = createContext<MemberContextValue | undefined>(undefined);

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
      let memberId = localStorage.getItem(STORAGE_KEY);

      if (!memberId) {
        memberId = generateUUID();
        localStorage.setItem(STORAGE_KEY, memberId);

        await supabase
          .from('member_profiles')
          .insert({
            id: memberId,
            dietary: [],
            travel_style: 'balanced',
            interests: [],
          });
      }

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

      const { data, error } = await supabase
        .from('member_profiles')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) {
        await supabase
          .from('member_profiles')
          .upsert({
            id: memberId,
            dietary: [],
            travel_style: 'balanced',
            interests: [],
          });

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

  if (!member) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading...</div>;
  }

  return (
    <MemberContext.Provider value={{ member, isInitialized }}>
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
