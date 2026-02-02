"use client";

import { useEffect, useState } from "react";
import { useIdeas } from "../hooks/useIdeas";
import { TripHeader } from "../components/layout/TripHeader";
import { IdeaSidebar } from "../components/layout/IdeaSidebar";
import { MapView } from "../components/layout/MapView";
import { useCreateTrip } from "../hooks/useTrip";
import { useMember } from "../contexts/MemberContext";
import { TripPlanningForm } from "../components/TripPlanningForm";
import { useCurrentTrip } from "../hooks/useCurrentTrip";

export function TripView() {
  const { member } = useMember();
  const [isGenerating, setIsGenerating] = useState(false);
  const createTripMutation = useCreateTrip();

  // Use the enhanced current trip management
  const {
    currentTrip: trip,
    currentTripId: tripId,
    handleTripCreated,
    isLoading: tripLoading,
    error: tripError,
  } = useCurrentTrip();

  const { data: ideas = [], isLoading: ideasLoading } = useIdeas(tripId);

  // Debug logging
  useEffect(() => {
    console.log(`🎯 TripView: tripId changed to ${tripId}`);
    console.log(`🎯 TripView: trip object:`, trip);
    console.log(`🎯 TripView: ideas count:`, ideas.length);
  }, [tripId, trip, ideas.length]);

  // Reset generating state when trip changes
  useEffect(() => {
    if (tripId) {
      // Check if we're currently generating suggestions for this trip
      if (typeof window !== "undefined") {
        const generating = localStorage.getItem("generating-suggestions");
        if (generating === "true") {
          setIsGenerating(true);
        } else {
          setIsGenerating(false);
        }
      }
    } else {
      setIsGenerating(false);
    }
  }, [tripId]);

  // Stop showing generating state once we have ideas
  useEffect(() => {
    if (ideas.length > 0 && isGenerating) {
      setIsGenerating(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("generating-suggestions");
      }
    }
  }, [ideas.length, isGenerating]);

  const handleTripCreatedWrapper = (newTripId: string) => {
    setIsGenerating(true);
    // The useCurrentTrip hook will handle the trip creation logic
    // We just need to find the trip object to pass to handleTripCreated
    // For now, we'll create a minimal trip object
    const newTrip = { id: newTripId } as any;
    handleTripCreated(newTrip);
  };

  // Show trip planning form if no trip
  if (!trip && tripId === null && member) {
    return (
      <TripPlanningForm
        createTripMutation={createTripMutation}
        memberId={member.id}
        onSuccess={handleTripCreatedWrapper}
      />
    );
  }

  // Loading state - show after we know there's a tripId
  if (tripLoading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <TripHeader trip={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
            <p className="text-muted-foreground">Loading trip...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state - show if trip loading failed
  if (tripError && tripId) {
    return (
      <div className="h-full flex flex-col bg-background">
        <TripHeader trip={null} />
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

  // Calculate map center from trip or ideas
  const mapCenter: [number, number] =
    trip?.destination_lat && trip?.destination_lng
      ? [trip.destination_lat, trip.destination_lng]
      : [40.7128, -74.006]; // Default NYC

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <TripHeader trip={trip || null} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1">
          <MapView ideas={ideas} center={mapCenter} />
        </div>

        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 overflow-hidden">
          <IdeaSidebar
            ideas={ideas}
            isLoading={ideasLoading}
            isGenerating={isGenerating}
          />
        </div>
      </div>
    </div>
  );
}
