import "./globals.css";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Toaster } from "sonner";
import { supabase, isUsingFallbackSupabase } from "./lib/supabase";

interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
}
import { ItineraryPanel } from "./components/ItineraryPanel";
import { MapPanel } from "./components/MapPanel";
import { BuildingState } from "./components/BuildingState";
import { EmptyState } from "./components/EmptyState";
import { ChatPanel } from "./components/chat/ChatPanel";
import { ActivityDetailModal } from "./components/ActivityDetailModal";
import { useAnnotations } from "./hooks/useAnnotations";
import { useChatAgent } from "./hooks/useChatAgent";
import { usePlacesEnrichment } from "./hooks/usePlacesEnrichment";
import { cn } from "./lib/utils";
import type { Activity, ItineraryData } from "./types";
import { parseDurationBucket } from "./lib/utils";

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

const DEBUG =
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ?? false;

const App = () => {
  const [tripId] = useState<string | null>(getTripId);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Bootstrap the Supabase session from the shell's window.__TRIPWEAVE_SESSION__.
  // mf-itinerary runs on a different port (3002) so it has its own empty localStorage —
  // the shell exposes its session via the window object so MFEs can hydrate their clients.
  // After hydrating, fetch the user profile once via getUser() — a single shot call
  // with no subscription, so it won't cause repeated re-renders.
  useEffect(() => {
    const shellSession = (
      window as unknown as {
        __TRIPWEAVE_SESSION__?: {
          access_token: string;
          refresh_token: string;
        } | null;
      }
    ).__TRIPWEAVE_SESSION__;
    if (shellSession?.access_token && shellSession?.refresh_token) {
      supabase.auth
        .setSession({
          access_token: shellSession.access_token,
          refresh_token: shellSession.refresh_token,
        })
        .then(async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;
          const { data } = await supabase
            .from("member_profiles")
            .select("display_name, avatar_url")
            .eq("user_id", user.id)
            .single();
          if (data) setUserProfile(data);
        });
    }
  }, []);

  const annotations = useAnnotations(tripId);
  // Stable ref so useChatAgent can call fetchItinerary even though it's defined below
  const fetchItineraryRef = useRef<((id: string) => void) | null>(null);
  const {
    messages,
    status: chatStatus,
    pendingChanges,
    error: chatError,
    isChatOpen,
    toggleChat,
    inputValue,
    setInputValue,
    sendMessage,
    confirmChanges,
    rejectChanges,
    clearError: clearChatError,
  } = useChatAgent({
    tripId,
    onItineraryUpdated: () => tripId && fetchItineraryRef.current?.(tripId),
  });

  // --- Chat panel resize drag state ---
  const CHAT_MIN_WIDTH = 200;
  const CHAT_DEFAULT_WIDTH = 320;
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT_WIDTH);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback(
    (clientX: number) => {
      isDragging.current = true;
      dragStartX.current = clientX;
      dragStartWidth.current = chatWidth;
      setIsDraggingHandle(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [chatWidth],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      const containerWidth =
        containerRef.current?.offsetWidth ?? window.innerWidth;
      const maxWidth = Math.floor(containerWidth * 0.5);
      setChatWidth(
        Math.max(
          CHAT_MIN_WIDTH,
          Math.min(dragStartWidth.current + delta, maxWidth),
        ),
      );
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setIsDraggingHandle(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );

  const fetchItinerary = useCallback(async (id: string) => {
    if (DEBUG)
      console.log("[mf-itinerary] fetchItinerary start", { tripId: id });
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("trip_itineraries")
      .select("*")
      .eq("trip_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (DEBUG) {
      console.log("[mf-itinerary] fetchItinerary result", {
        tripId: id,
        hasData: !!data,
        dataId: data?.id,
        error: fetchError?.message ?? null,
        code: fetchError?.code,
      });
      if (!data && !fetchError && isUsingFallbackSupabase) {
        console.warn(
          "[mf-itinerary] No itinerary row found and this MF is using the fallback Supabase project. Add client/mf-itinerary/.env.local with the same VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as client/shell/.env.local so this MF queries the same project where your trip lives.",
        );
      }
    }

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setItinerary(data as Itinerary);
      localStorage.removeItem("building-itinerary");
      setIsBuilding(false);
    }

    setIsLoading(false);
  }, []);

  // Keep ref in sync so the chat agent can trigger a refetch after confirm
  fetchItineraryRef.current = fetchItinerary;

  useEffect(() => {
    if (!tripId) {
      if (DEBUG)
        console.log("[mf-itinerary] No tripId, skipping fetch and Realtime");
      return;
    }

    if (DEBUG) console.log("[mf-itinerary] Mount effect", { tripId });

    const buildingTripId = localStorage.getItem("building-itinerary");
    if (buildingTripId === tripId) {
      setIsBuilding(true);
      if (DEBUG)
        console.log(
          "[mf-itinerary] building-itinerary flag set for this trip",
          { tripId },
        );
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
          if (DEBUG)
            console.log(
              "[mf-itinerary] Realtime itinerary update:",
              payload.eventType,
              payload,
            );
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            setItinerary(payload.new as Itinerary);
            setIsBuilding(false);
            localStorage.removeItem("building-itinerary");
          }
        },
      )
      .subscribe((status) => {
        if (DEBUG)
          console.log("[mf-itinerary] Realtime subscription status", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, fetchItinerary]);

  // Parse the itinerary JSON into typed data
  const itineraryData: ItineraryData | null = (() => {
    if (!itinerary?.itinerary) return null;
    try {
      const raw = itinerary.itinerary as Record<string, unknown>;
      // Support both { days: [...] } and { itinerary: { days: [...] } } shapes
      const inner = (raw.itinerary ?? raw) as Record<string, unknown>;
      if (inner.days && Array.isArray(inner.days)) {
        const parsed = inner as unknown as ItineraryData;
        // Normalise fields coming from the server
        for (const day of parsed.days) {
          // Server uses day_number, client expects day
          if (!day.day && (day as any).day_number) {
            day.day = (day as any).day_number;
          }
          for (const act of day.activities) {
            // Server uses title, client expects name
            if (!act.name && (act as any).title) {
              act.name = (act as any).title;
            }
            if (!act.duration_minutes || isNaN(act.duration_minutes)) {
              act.duration_minutes = parseDurationBucket(
                (act as unknown as Record<string, unknown>)
                  .duration_bucket as string,
              );
            }
          }
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  })();

  const allActivities = useMemo(
    () => itineraryData?.days.flatMap((d) => d.activities) ?? [],
    [itineraryData],
  );
  const enrichmentMap = usePlacesEnrichment(allActivities);

  if (!tripId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <p className="text-sm text-muted-foreground">
          No trip selected. Go to Pre-Trip and click "Build Trip".
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Toaster position="bottom-right" richColors closeButton />
      {isBuilding && <BuildingState />}

      {isLoading && !isBuilding && (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading itinerary...</p>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-lg bg-red-950 text-red-300 text-sm">
          Error: {error}
        </div>
      )}

      {!isLoading &&
        !itinerary &&
        !isBuilding &&
        (() => {
          if (DEBUG) {
            console.log("[mf-itinerary] Showing EmptyState because", {
              isLoading,
              hasItinerary: !!itinerary,
              isBuilding,
              tripId,
              error: error ?? null,
            });
          }
          return <EmptyState />;
        })()}

      {itineraryData && (
        <div ref={containerRef} className="flex flex-1 min-h-0">
          {/* Chat panel — slides in from the left when open */}
          <div
            className={cn(
              "flex-shrink-0 overflow-hidden",
              !isDraggingHandle &&
                "transition-[width] duration-300 ease-in-out",
            )}
            style={{ width: isChatOpen ? chatWidth : 0 }}
          >
            <div style={{ width: chatWidth }} className="h-full">
              <ChatPanel
                messages={messages}
                status={chatStatus}
                pendingChanges={pendingChanges}
                error={chatError}
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSend={sendMessage}
                onConfirm={confirmChanges}
                onReject={rejectChanges}
                onDismissError={clearChatError}
                userProfile={userProfile}
              />
            </div>
          </div>

          {/* Drag handle between chat and itinerary — only visible when chat is open */}
          {isChatOpen && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                handleDragStart(e.clientX);
              }}
              onDoubleClick={() => setChatWidth(CHAT_DEFAULT_WIDTH)}
              className="flex-shrink-0 flex items-center justify-center w-3 cursor-col-resize group relative bg-border/40 hover:bg-teal-500/15 transition-colors duration-150 border-x border-border"
            >
              {/* Three-dot indicator */}
              <svg
                width="6"
                height="24"
                viewBox="0 0 6 24"
                className="text-muted-foreground/60 group-hover:text-teal-500 transition-colors duration-150"
                fill="currentColor"
              >
                <circle cx="3" cy="5" r="1.75" />
                <circle cx="3" cy="12" r="1.75" />
                <circle cx="3" cy="19" r="1.75" />
              </svg>
            </div>
          )}

          {/* Itinerary panel */}
          <div
            className={cn(isChatOpen ? "flex-1" : "w-1/2", "overflow-y-auto")}
          >
            <ItineraryPanel
              data={itineraryData}
              tripId={tripId}
              itineraryRowId={itinerary!.id}
              onOpenActivity={setSelectedActivity}
              isChatOpen={isChatOpen}
              onToggleChat={toggleChat}
            />
          </div>

          <div className={cn(isChatOpen ? "flex-1" : "w-1/2", "relative")}>
            <MapPanel
              activities={itineraryData.days.flatMap((d) => d.activities)}
              annotations={annotations}
            />
            {selectedActivity && (
              <ActivityDetailModal
                activity={selectedActivity}
                enrichment={enrichmentMap.get(selectedActivity.name) ?? null}
                onClose={() => setSelectedActivity(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* Fallback: show raw JSON if data doesn't match expected shape */}
      {itinerary && !itineraryData && !isLoading && (
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-2">
            Raw itinerary data (unexpected format):
          </p>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[70vh] whitespace-pre-wrap break-words">
            {JSON.stringify(itinerary.itinerary, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default App;
