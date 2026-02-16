import { useState, useCallback } from "react";
import { createApiUrl } from "../lib/api";
import { supabase } from "../lib/supabase";

/**
 * useStartItineraryBuild — fires the AI itinerary generation API
 * and navigates to the itinerary microfrontend.
 *
 * The API call is fire-and-forget: we don't await completion before
 * navigating. The itinerary MF picks up the in-progress state via
 * a localStorage flag and subscribes to Supabase realtime for the result.
 */
export const useStartItineraryBuild = () => {
  const [isStarting, setIsStarting] = useState(false);

  const startBuild = useCallback(async (tripId: string) => {
    setIsStarting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        console.error("No auth session found — cannot start itinerary build");
        setIsStarting(false);
        return;
      }

      localStorage.setItem("building-itinerary", tripId);

      fetch(createApiUrl(`/itinerary/${tripId}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            console.error("Itinerary build API returned error:", res.status);
          } else {
            console.log("Itinerary build API completed successfully");
          }
        })
        .catch((err) => {
          console.error("Itinerary build API failed:", err);
        })
        .finally(() => {
          localStorage.removeItem("building-itinerary");
        });

      window.location.href = `/itinerary?tripId=${tripId}`;
    } catch (err) {
      console.error("Failed to start itinerary build:", err);
      setIsStarting(false);
    }
  }, []);

  return { startBuild, isStarting };
};
