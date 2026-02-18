import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase";

type Itinerary = {
  id: string;
  trip_id: string | null;
  itinerary: unknown;
  created_at: string;
  updated_at: string | null;
};

const getTripId = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get("tripId") || localStorage.getItem("current-trip-id");
};

const App = () => {
  const [tripId] = useState<string | null>(getTripId);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styleInjected = useRef(false);

  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const sheet = document.createElement("style");
    sheet.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(sheet);
  }, []);

  const fetchItinerary = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("trip_itineraries")
      .select("*")
      .eq("trip_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setItinerary(data as Itinerary);
      localStorage.removeItem("building-itinerary");
      setIsBuilding(false);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!tripId) return;

    const buildingTripId = localStorage.getItem("building-itinerary");
    if (buildingTripId === tripId) {
      setIsBuilding(true);
    }

    fetchItinerary(tripId);

    const channel = supabase
      .channel(`itinerary-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_itineraries",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log("Itinerary realtime update:", payload);
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            setItinerary(payload.new as Itinerary);
            setIsBuilding(false);
            localStorage.removeItem("building-itinerary");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchItinerary]);

  if (!tripId) {
    return (
      <div style={styles.container}>
        <h1 style={styles.heading}>Itinerary</h1>
        <p style={styles.muted}>No trip selected. Go to Pre-Trip and click "Build Trip".</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Itinerary</h1>
      <p style={styles.muted}>Trip ID: {tripId}</p>

      {isBuilding && (
        <div style={styles.buildingBanner}>
          <span style={styles.spinner} />
          Building your itinerary with AI... This may take 15–30 seconds.
        </div>
      )}

      {isLoading && !isBuilding && (
        <p style={styles.muted}>Loading itinerary...</p>
      )}

      {error && (
        <div style={styles.errorBanner}>Error: {error}</div>
      )}

      {!isLoading && !itinerary && !isBuilding && (
        <p style={styles.muted}>No itinerary found for this trip yet.</p>
      )}

      {itinerary && (
        <div>
          <h2 style={styles.subheading}>
            Raw Itinerary Data
            <span style={styles.timestamp}>
              {" "}(updated: {itinerary.updated_at || itinerary.created_at})
            </span>
          </h2>
          <pre style={styles.jsonBlock}>
            {JSON.stringify(itinerary.itinerary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "2rem",
    maxWidth: "960px",
    margin: "0 auto",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  heading: {
    fontSize: "1.5rem",
    fontWeight: 700,
    marginBottom: "0.5rem",
  },
  subheading: {
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
  },
  timestamp: {
    fontSize: "0.75rem",
    fontWeight: 400,
    color: "#888",
  },
  muted: {
    color: "#888",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
  buildingBanner: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem",
    marginBottom: "1rem",
    borderRadius: "8px",
    backgroundColor: "#1e1b4b",
    color: "#c7d2fe",
    fontSize: "0.875rem",
    fontWeight: 500,
  },
  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid #c7d2fe",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBanner: {
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    borderRadius: "8px",
    backgroundColor: "#450a0a",
    color: "#fca5a5",
    fontSize: "0.875rem",
  },
  jsonBlock: {
    backgroundColor: "#1a1a2e",
    color: "#e2e8f0",
    padding: "1.5rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    lineHeight: 1.5,
    overflow: "auto",
    maxHeight: "70vh",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};

export default App;
