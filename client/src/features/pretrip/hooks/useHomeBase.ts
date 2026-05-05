import { useState, useCallback, useEffect } from "react";

export function useHomeBase(tripId: string | null) {
  const storageKey = tripId ? `homebase-${tripId}` : null;

  const [homeBaseId, setHomeBaseIdState] = useState<string | null>(() => {
    if (!storageKey) return null;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });

  // Sync when tripId changes
  useEffect(() => {
    if (!storageKey) {
      setHomeBaseIdState(null);
      return;
    }
    try {
      setHomeBaseIdState(localStorage.getItem(storageKey));
    } catch {
      setHomeBaseIdState(null);
    }
  }, [storageKey]);

  const setHomeBase = useCallback(
    (ideaId: string) => {
      if (!storageKey) return;
      // Toggle: if already home base, clear it
      const newValue = homeBaseId === ideaId ? null : ideaId;
      try {
        if (newValue) {
          localStorage.setItem(storageKey, newValue);
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {
        // private browsing
      }
      setHomeBaseIdState(newValue);
    },
    [storageKey, homeBaseId],
  );

  const clearHomeBase = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setHomeBaseIdState(null);
  }, [storageKey]);

  return { homeBaseId, setHomeBase, clearHomeBase };
}
