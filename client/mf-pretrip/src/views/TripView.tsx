"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useIdeas } from "../hooks/useIdeas";
import { TripHeader } from "../components/layout/TripHeader";
import { IdeaSidebar } from "../components/layout/IdeaSidebar";
import { MapView } from "../components/layout/MapView";
import { useCreateTrip } from "../hooks/useTrip";
import { useMember } from "../contexts/MemberContext";
import { TripPlanningForm } from "../components/TripPlanningForm";
import { useCurrentTrip } from "../hooks/useCurrentTrip";
import { useRealtimeTrip, type Annotation } from "../hooks/useRealtimeTrip";
import { useTripMembers } from "../hooks/useTripMembers";
import { useBroadcastTripSummary } from "../hooks/useBroadcastTripSummary";
import { supabase } from "../lib/supabase";
import {
  useStreamingSuggestions,
  type TripSuggestionInput,
} from "../hooks/useStreamingSuggestions";
import { useModals } from "../contexts/ModalContext";
import { queryKeys } from "../lib/queryKeys";

// Ideas are always sourced from useIdeas (backed by Supabase realtime).
// The SSE streaming hook is only used for progress UI during generation.
import { GeneratingOverlay } from "../components/GeneratingOverlay";
import { TripViewSkeleton } from "../components/skeletons/TripViewSkeleton";

export function TripView() {
  const queryClient = useQueryClient();
  const { member } = useMember();
  const [isGenerating, setIsGenerating] = useState(false);
  const [highlightedAnnotationId, setHighlightedAnnotationId] = useState<
    string | null
  >(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const justCreatedTripRef = useRef(false);
  const createTripMutation = useCreateTrip();
  const mapViewRef = useRef<{ setDrawMode: (enabled: boolean) => void }>(null);
  const {
    isStreaming,
    isComplete: isStreamingComplete,
    progress: streamingProgress,
    startStreaming,
  } = useStreamingSuggestions();

  const { openModal } = useModals();

  const handleOpenAddIdea = useCallback(() => {
    openModal("addIdea", { startStreaming, isStreaming });
  }, [openModal, startStreaming, isStreaming]);

  // Use the enhanced current trip management
  const {
    currentTrip: trip,
    currentTripId: tripId,
    setCurrentTrip,
    handleTripCreated,
    isLoading: tripLoading,
    error: tripError,
    isTripIdInitialized,
  } = useCurrentTrip();

  const { data: members = [] } = useTripMembers(tripId);
  useBroadcastTripSummary(trip, members.length);

  const { data: ideas = [], isLoading: ideasLoading } = useIdeas(tripId);
  const { annotations: realtimeAnnotations, onlineUsers } = useRealtimeTrip(
    tripId,
    member,
  );

  // Local state for optimistic updates
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>([]);

  // Sync realtime annotations to local state
  useEffect(() => {
    setLocalAnnotations(realtimeAnnotations);
  }, [realtimeAnnotations]);

  // Debug logging
  useEffect(() => {
    console.log(`🎯 TripView: tripId changed to ${tripId}`);
    console.log(`🎯 TripView: trip object:`, trip);
    console.log(`🎯 TripView: ideas count:`, ideas.length);
    console.log(`🎯 TripView: annotations count:`, localAnnotations.length);
  }, [tripId, trip, ideas.length, localAnnotations.length]);

  // Keep a stable ref to startStreaming so useEffects don't re-fire on every render
  const startStreamingRef = useRef(startStreaming);
  startStreamingRef.current = startStreaming;

  // When trip changes, check if there's a pending streaming request (e.g. from CreateTripModal)
  useEffect(() => {
    if (justCreatedTripRef.current) {
      justCreatedTripRef.current = false;
      return;
    }
    if (tripId) {
      if (typeof window !== "undefined") {
        const generating = localStorage.getItem("generating-suggestions");
        const pendingInput = localStorage.getItem("pending-suggestion-input");

        if (generating === "true" || pendingInput) {
          setIsGenerating(true);
          // Check for pending suggestion input from CreateTripModal
          if (pendingInput && !isStreaming) {
            try {
              const suggestionInput = JSON.parse(pendingInput);
              localStorage.removeItem("pending-suggestion-input");
              startStreamingRef.current(suggestionInput);
            } catch {
              // bad JSON, clear it
              localStorage.removeItem("pending-suggestion-input");
            }
          }
        } else if (!isStreaming) {
          setIsGenerating(false);
        }
      }
    } else if (!isStreaming) {
      setIsGenerating(false);
    }
  }, [tripId, isStreaming]);

  // Keep generating state aligned with streaming lifecycle
  useEffect(() => {
    if (isStreaming) {
      setIsGenerating(true);
    }
  }, [isStreaming]);

  // Stop showing generating state once streaming is complete and we have ideas
  useEffect(() => {
    if (
      isGenerating &&
      !isStreaming &&
      (isStreamingComplete || ideas.length > 0)
    ) {
      setIsGenerating(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("generating-suggestions");
      }
    }
  }, [ideas.length, isGenerating, isStreaming, isStreamingComplete]);

  // Invalidate ideas query when streaming completes to catch any ideas missed by realtime
  useEffect(() => {
    if (isStreamingComplete && tripId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas(tripId) });
    }
  }, [isStreamingComplete, tripId, queryClient]);

  const handleTripCreatedWrapper = useCallback(
    (newTripId: string, suggestionInput: TripSuggestionInput) => {
      justCreatedTripRef.current = true;
      setIsGenerating(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("generating-suggestions", "true");
      }
      // The useCurrentTrip hook will handle the trip creation logic
      // We just need to find the trip object to pass to handleTripCreated
      // For now, we'll create a minimal trip object
      const newTrip = { id: newTripId } as any;
      handleTripCreated(newTrip);
      startStreaming(suggestionInput);
    },
    [handleTripCreated, startStreaming],
  );

  // Show skeleton while initializing (reading tripId from URL/localStorage) or loading trip
  if (!isTripIdInitialized || tripLoading) {
    return (
      <TripViewSkeleton
        onTripSelect={setCurrentTrip}
        isGenerating={isGenerating || isStreaming}
      />
    );
  }

  // Show trip planning form only after we've confirmed there's no trip
  if (!trip && tripId === null && member) {
    return (
      <TripPlanningForm
        createTripMutation={createTripMutation}
        memberId={member.id}
        onSuccess={handleTripCreatedWrapper}
      />
    );
  }

  // Trip not found (deleted or inaccessible) - useCurrentTrip clears stale ID; show selector meanwhile
  if (tripId && !trip && !tripLoading && !tripError) {
    return (
      <div className="h-full flex flex-col bg-background">
        <TripHeader trip={null} onTripSelect={setCurrentTrip} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            This trip is no longer available. Select a trip above.
          </p>
        </div>
      </div>
    );
  }

  // Error state - show if trip loading failed (network/DB error)
  if (tripError && tripId) {
    return (
      <div className="h-full flex flex-col bg-background">
        <TripHeader trip={null} onTripSelect={setCurrentTrip} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-destructive">Failed to load trip</p>
            <p className="text-muted-foreground text-sm">
              {tripError.message || "An error occurred while loading the trip"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate map center from first idea with coordinates or trip destination
  const firstGeoIdea = ideas.find((s) => s.latitude && s.longitude);
  const mapCenter: [number, number] =
    firstGeoIdea?.latitude && firstGeoIdea?.longitude
      ? [firstGeoIdea.latitude, firstGeoIdea.longitude]
      : trip?.destination_lat && trip?.destination_lng
        ? [trip.destination_lat, trip.destination_lng]
        : [40.7128, -74.006]; // Default NYC

  // Show the full-screen generating overlay only when generating AND no ideas yet
  const showGeneratingEmpty =
    (isGenerating || isStreaming) && ideas.length === 0;

  // Annotation handlers
  const handleAnnotationClick = (annotation: Annotation) => {
    setHighlightedAnnotationId(annotation.id);
    // Clear highlight after 2 seconds
    setTimeout(() => setHighlightedAnnotationId(null), 2000);
  };

  const handleAnnotationDelete = async (annotationId: string) => {
    console.log("🗑️ Deleting annotation:", annotationId);

    // Optimistic update - remove immediately from UI
    setLocalAnnotations((prev) => prev.filter((a) => a.id !== annotationId));

    const { error } = await supabase
      .from("trip_annotations" as any)
      .delete()
      .eq("id", annotationId);

    if (error) {
      console.error("❌ Failed to delete annotation:", error);
      // Revert optimistic update on error
      setLocalAnnotations(realtimeAnnotations);
      alert("Failed to delete annotation. Please try again.");
    } else {
      console.log("✅ Annotation deleted successfully");
    }
  };

  const handleDrawModeToggle = (enabled: boolean) => {
    mapViewRef.current?.setDrawMode(enabled);
  };

  return (
    <div className="h-full flex bg-background">
      {/* Left: Header + Map */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <TripHeader trip={trip || null} onTripSelect={setCurrentTrip} />

        {/* Map — always mounted so ideas appear instantly when they arrive */}
        <div className="flex-1 relative">
          <MapView
            ideas={ideas}
            center={mapCenter}
            tripId={tripId}
            highlightedAnnotationId={highlightedAnnotationId}
            onAnnotationSaved={(ann) =>
              setLocalAnnotations((prev) => [...prev, ann])
            }
            ref={mapViewRef}
          />
          {showGeneratingEmpty && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <GeneratingOverlay
                destination={trip?.destination ?? null}
                interests={trip?.interests ?? null}
                budgetLevel={trip?.budget_level ?? null}
                durationDays={trip?.duration_days ?? null}
                progress={streamingProgress}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sidebar area */}
      {sidebarCollapsed ? (
        /* Collapsed rail — always visible */
        <div className="flex-shrink-0 w-10 border-l bg-muted/40 flex flex-col items-center pt-4 gap-3">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Open sidebar"
          >
            <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-[10px] text-muted-foreground [writing-mode:vertical-lr] select-none">
            Ideas
          </span>
        </div>
      ) : (
        /* Expanded sidebar */
        <div className="flex-shrink-0 w-80 relative">
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="absolute -left-3 top-20 z-10 bg-background border rounded-full p-1 shadow-sm hover:bg-muted transition-colors"
            aria-label="Close sidebar"
          >
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
          </button>
          <IdeaSidebar
            ideas={ideas}
            annotations={localAnnotations}
            isLoading={ideasLoading}
            isGenerating={isGenerating || isStreaming}
            tripId={tripId}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationDelete={handleAnnotationDelete}
            onDrawModeToggle={handleDrawModeToggle}
            onOpenAddIdea={handleOpenAddIdea}
            totalExpected={5}
          />
        </div>
      )}
    </div>
  );
}
