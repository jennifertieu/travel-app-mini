import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const API_BASE_URL =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ??
  (import.meta.env.PUBLIC_BACKEND_URL as string | undefined) ??
  'http://localhost:5001';

export interface DemoLocation {
  name: string;
  lat: number;
  lng: number;
  day?: number;
  date?: string;       // ISO date string e.g. "2025-02-24"
  startMinutes?: number; // minutes from midnight for activity start time
}

export const SEOUL_LOCATIONS: DemoLocation[] = [
  { name: 'Gyeongbokgung Palace', lat: 37.5796, lng: 126.9770 },
  { name: 'Myeongdong', lat: 37.5636, lng: 126.9859 },
  { name: 'Itaewon', lat: 37.5344, lng: 126.9947 },
  { name: 'Hongdae', lat: 37.5563, lng: 126.9233 },
  { name: 'Bukchon Hanok Village', lat: 37.5824, lng: 126.9854 },
];

function makeDefaultTime(): Date {
  const d = new Date();
  d.setHours(10, 30, 0, 0);
  return d;
}

function hasDemoAccess(): boolean {
  return localStorage.getItem('demo-access') === 'true';
}

function isDemoEnabled(): boolean {
  return localStorage.getItem('demo-enabled') === 'true';
}

export interface DemoDay {
  day: number;
  date: string; // ISO date string e.g. "2025-02-24"
}

export interface DemoContextValue {
  isDemo: boolean;
  demoTime: Date;
  demoLocation: DemoLocation;
  tripLocations: DemoLocation[];
  tripDays: DemoDay[];
  setDemoTime: (time: Date) => void;
  setDemoLocation: (loc: DemoLocation) => void;
  setTripLocations: (locs: DemoLocation[]) => void;
  setTripDays: (days: DemoDay[]) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue>({
  isDemo: false,
  demoTime: makeDefaultTime(),
  demoLocation: SEOUL_LOCATIONS[0],
  tripLocations: [],
  tripDays: [],
  setDemoTime: () => {},
  setDemoLocation: () => {},
  setTripLocations: () => {},
  setTripDays: () => {},
  resetDemo: () => {},
});

export function useDemoContext(): DemoContextValue {
  return useContext(DemoContext);
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemo, setIsDemo] = useState(() => hasDemoAccess() && isDemoEnabled());
  const [demoTime, setDemoTime] = useState<Date>(makeDefaultTime);
  const [demoLocation, setDemoLocation] = useState<DemoLocation>(SEOUL_LOCATIONS[0]);
  const [tripLocations, setTripLocations] = useState<DemoLocation[]>([]);
  const [tripDays, setTripDays] = useState<DemoDay[]>([]);

  // On mount: check ?demo URL param and verify access via API if not already cached
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('demo')) return;

    // Already verified — just enable
    if (hasDemoAccess()) {
      localStorage.setItem('demo-enabled', 'true');
      setIsDemo(true);
      window.dispatchEvent(new CustomEvent('demo-access-granted'));
      window.dispatchEvent(new CustomEvent('demo-toggle', { detail: { enabled: true } }));
      return;
    }

    const checkAccess = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/demo/access`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const { allowed } = await res.json();
        if (allowed) {
          localStorage.setItem('demo-access', 'true');
          localStorage.setItem('demo-enabled', 'true');
          setIsDemo(true);
          window.dispatchEvent(new CustomEvent('demo-access-granted'));
          window.dispatchEvent(new CustomEvent('demo-toggle', { detail: { enabled: true } }));
        }
      } catch {
        // Not whitelisted or network error — fail silently
      }
    };

    checkAccess();
  }, []);

  // Listen for toggle events dispatched by the shell nav
  useEffect(() => {
    const handler = (e: Event) => {
      const { enabled } = (e as CustomEvent<{ enabled: boolean }>).detail;
      setIsDemo(enabled);
      if (!enabled) {
        setDemoTime(makeDefaultTime());
        setDemoLocation(SEOUL_LOCATIONS[0]);
      }
    };
    window.addEventListener('demo-toggle', handler);
    return () => window.removeEventListener('demo-toggle', handler);
  }, []);

  const resetDemo = useCallback(() => {
    setDemoTime(makeDefaultTime());
    setDemoLocation(SEOUL_LOCATIONS[0]);
  }, []);

  const handleSetTripLocations = useCallback((locs: DemoLocation[]) => {
    setTripLocations(locs);
  }, []);

  const handleSetTripDays = useCallback((days: DemoDay[]) => {
    setTripDays(days);
  }, []);

  return (
    <DemoContext.Provider
      value={{
        isDemo,
        demoTime,
        demoLocation,
        tripLocations,
        tripDays,
        setDemoTime,
        setDemoLocation,
        setTripLocations: handleSetTripLocations,
        setTripDays: handleSetTripDays,
        resetDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
