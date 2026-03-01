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
 *
 * NOTE: We intentionally do NOT remove the localStorage flag here.
 * The mf-itinerary App clears it when it receives the realtime update
 * or fetches the completed itinerary. Removing it here would race
 * with the page navigation and could cause the loading state to never show.
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

      // Set the flag BEFORE firing the request so the itinerary page
      // can pick it up immediately on load.
      localStorage.setItem("building-itinerary", tripId);
      localStorage.setItem("building-itinerary-started", Date.now().toString());

      console.log(
        `[useStartItineraryBuild] Firing itinerary build for trip ${tripId}`,
      );

      // Fire-and-forget — we navigate immediately, the server processes
      // in the background and the itinerary MF picks up the result via
      // Supabase realtime. We use keepalive so the browser doesn't cancel
      // the request on navigation.
      fetch(createApiUrl(`/itinerary/${tripId}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        keepalive: true,
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
        });

      window.location.href = `/itinerary?tripId=${tripId}`;
    } catch (err) {
      console.error("Failed to start itinerary build:", err);
      setIsStarting(false);
    }
  }, []);

  return { startBuild, isStarting };
};
