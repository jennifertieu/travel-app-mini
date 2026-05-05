"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useIdeas } from "../hooks/useIdeas";

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
import { useStreamingHotels } from "../hooks/useStreamingHotels";
import { useHomeBase } from "../hooks/useHomeBase";
import { useModal } from "@/contexts/ModalContext";
import { useMyReactions } from "../hooks/useMyReactions";
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

  const {
    isStreaming: isHotelStreaming,
    isComplete: isHotelStreamingComplete,
    savedCount: hotelSavedCount,
    startStreaming: startHotelStreaming,
  } = useStreamingHotels();

  const isAnyStreaming = isStreaming || isHotelStreaming;

  const { openModal } = useModal();

  // Open modals when navigated from shell (e.g. + invite from itinerary/duringtrip)
  useEffect(() => {
    try {
      if (sessionStorage.getItem("pending-open-create-trip") === "1") {
        sessionStorage.removeItem("pending-open-create-trip");
        openModal("createTrip");
        return;
      }
      const pendingModal = sessionStorage.getItem("pending-open-modal");
      if (pendingModal === "inviteLink") {
        const pendingTripId =
          sessionStorage.getItem("pending-open-modal-tripId") ?? undefined;
        sessionStorage.removeItem("pending-open-modal");
        sessionStorage.removeItem("pending-open-modal-tripId");
        if (pendingTripId) {
          openModal("inviteLink", { tripId: pendingTripId });
        }
      }
    } catch {
      // ignore
    }
  }, [openModal]);

  const handleOpenAddIdea = useCallback(() => {
    openModal("addIdea", { startStreaming, isStreaming: isAnyStreaming });
  }, [openModal, startStreaming, isAnyStreaming]);

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

  const { homeBaseId, setHomeBase } = useHomeBase(tripId);

  const handleMoreIdeas = useCallback(() => {
    if (!tripId || !trip || !member) return;
    startStreaming({
      tripId,
      destination: trip.destination,
      durationDays: trip.duration_days ?? null,
      budgetLevel: trip.budget_level ?? null,
      interests: trip.interests ?? null,
      createdBy: member.id,
    });
  }, [tripId, trip, member, startStreaming]);

  const handleMoreHotels = useCallback(() => {
    if (!tripId || !trip || !member) return;
    startHotelStreaming({
      tripId,
      destination: trip.destination,
      interests: trip.interests ?? null,
      budgetLevel: trip.budget_level ?? null,
      durationDays: trip.duration_days ?? null,
      createdBy: member.id,
    });
  }, [tripId, trip, member, startHotelStreaming]);

  const { data: members = [] } = useTripMembers(tripId);
  useBroadcastTripSummary(trip, members.length);

  const { data: ideas = [], isLoading: ideasLoading } = useIdeas(tripId);
  const { annotations: realtimeAnnotations, onlineUsers } = useRealtimeTrip(
    tripId,
    member,
  );

  // Compute unrated count for the Rate pill in the sidebar
  const ratedIdeas = ideas.filter((i) => i.enrichment_status === "DONE");
  const ratedIdeaIds = ratedIdeas.map((i) => i.id);
  const { data: myReactions = {} } = useMyReactions(
    member?.id ?? null,
    ratedIdeaIds,
  );
  const unratedCount = ratedIdeaIds.filter((id) => !myReactions[id]).length;

  // Debug logging
  useEffect(() => {
    console.log(`🎯 TripView: tripId changed to ${tripId}`);
    console.log(`🎯 TripView: trip object:`, trip);
    console.log(`🎯 TripView: ideas count:`, ideas.length);
    console.log(`🎯 TripView: annotations count:`, realtimeAnnotations.length);
  }, [tripId, trip, ideas.length, realtimeAnnotations.length]);

  // Keep a stable ref to startStreaming so useEffects don't re-fire on every render
  const startStreamingRef = useRef(startStreaming);
  startStreamingRef.current = startStreaming;
  const startHotelStreamingRef = useRef(startHotelStreaming);
  startHotelStreamingRef.current = startHotelStreaming;

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
          if (pendingInput && !isAnyStreaming) {
            try {
              const suggestionInput = JSON.parse(pendingInput);
              localStorage.removeItem("pending-suggestion-input");
              startStreamingRef.current(suggestionInput);
              startHotelStreamingRef.current(suggestionInput);
            } catch {
              // bad JSON, clear it
              localStorage.removeItem("pending-suggestion-input");
            }
          }
        } else if (!isAnyStreaming) {
          setIsGenerating(false);
        }
      }
    } else if (!isAnyStreaming) {
      setIsGenerating(false);
    }
  }, [tripId, isAnyStreaming]);

  // Keep generating state aligned with streaming lifecycle
  useEffect(() => {
    if (isAnyStreaming) {
      setIsGenerating(true);
    }
  }, [isAnyStreaming]);

  // Stop showing generating state once both streams are complete and we have ideas
  useEffect(() => {
    if (
      isGenerating &&
      !isAnyStreaming &&
      ((isStreamingComplete && isHotelStreamingComplete) || ideas.length > 0)
    ) {
      setIsGenerating(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("generating-suggestions");
      }
    }
  }, [
    ideas.length,
    isGenerating,
    isAnyStreaming,
    isStreamingComplete,
    isHotelStreamingComplete,
  ]);

  // Invalidate ideas query when streaming completes to catch any ideas missed by realtime
  useEffect(() => {
    if ((isStreamingComplete || isHotelStreamingComplete) && tripId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.ideas(tripId) });
    }
  }, [isStreamingComplete, isHotelStreamingComplete, tripId, queryClient]);

  const handleTripCreatedWrapper = useCallback(
    (newTripId: string, suggestionInput: TripSuggestionInput) => {
      justCreatedTripRef.current = true;
      setIsGenerating(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("generating-suggestions", "true");
      }
      const newTrip = { id: newTripId } as any;
      handleTripCreated(newTrip);
      // Fire both streams in parallel
      startStreaming(suggestionInput);
      startHotelStreaming(suggestionInput);
    },
    [handleTripCreated, startStreaming, startHotelStreaming],
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
    (isGenerating || isAnyStreaming) && ideas.length === 0;

  // Annotation handlers
  const handleAnnotationClick = (annotation: Annotation) => {
    setHighlightedAnnotationId(annotation.id);
    // Clear highlight after 2 seconds
    setTimeout(() => setHighlightedAnnotationId(null), 2000);
  };

  const handleAnnotationDelete = async (annotationId: string) => {
    const { error } = await supabase
      .from("trip_annotations" as any)
      .delete()
      .eq("id", annotationId);

    if (error) {
      console.error("❌ Failed to delete annotation:", error);
      alert("Failed to delete annotation. Please try again.");
    }
  };

  const handleDrawModeToggle = (enabled: boolean) => {
    mapViewRef.current?.setDrawMode(enabled);
  };

  return (
    <div className="h-full flex bg-background">
      {/* Sidebar area */}
      {sidebarCollapsed ? (
        /* Collapsed rail */
        <div className="flex-shrink-0 w-10 border-r bg-muted/40 flex flex-col items-center pt-4 gap-3">
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
        <div className="flex-shrink-0 w-[500px] relative">
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="absolute -right-3 top-20 z-10 bg-background border rounded-full p-1 shadow-sm hover:bg-muted transition-colors"
            aria-label="Close sidebar"
          >
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
          </button>
          <IdeaSidebar
            ideas={ideas}
            annotations={realtimeAnnotations}
            isLoading={ideasLoading}
            isGenerating={isGenerating || isAnyStreaming}
            tripId={tripId}
            memberId={member?.id ?? null}
            memberName={member?.displayName ?? null}
            trip={trip}
            unratedCount={ratedIdeas.length > 0 ? unratedCount : 0}
            onOpenRating={() => openModal("ratingMode")}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationDelete={handleAnnotationDelete}
            onDrawModeToggle={handleDrawModeToggle}
            onOpenAddIdea={handleOpenAddIdea}
            totalExpected={5}
            startHotelStreaming={startHotelStreaming}
            isHotelStreaming={isHotelStreaming}
            homeBaseId={homeBaseId}
            onSetHomeBase={setHomeBase}
            onMoreIdeas={handleMoreIdeas}
            onMoreHotels={handleMoreHotels}
          />
        </div>
      )}

      {/* Right: Map */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Map — always mounted so ideas appear instantly when they arrive */}
        <div className="flex-1 relative">
          <MapView
            ideas={ideas}
            center={mapCenter}
            tripId={tripId}
            highlightedAnnotationId={highlightedAnnotationId}
            homeBaseId={homeBaseId}
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
    </div>
  );
}
