"use client";

import { useEffect, useState } from "react";
import { useTrip } from "../hooks/useTrip";
import { useIdeas } from "../hooks/useIdeas";
import { TripHeader } from "../components/layout/TripHeader";
import { IdeaSidebar } from "../components/layout/IdeaSidebar";
import { MapView } from "../components/layout/MapView";
import { useCreateTrip } from "../hooks/useTrip";
import { useMember } from "../contexts/MemberContext";
import { TripPlanningForm } from "../components/TripPlanningForm";

export function TripView() {
  const { member } = useMember();
  const [tripId, setTripId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const createTripMutation = useCreateTrip();

  // Load trip ID from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTripId = localStorage.getItem('current-trip-id');
      setTripId(storedTripId);
      
      // Check if we're currently generating suggestions
      const generating = localStorage.getItem('generating-suggestions');
      if (generating === 'true') {
        setIsGenerating(true);
      }
    }
  }, []);

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: ideas = [], isLoading: ideasLoading } = useIdeas(tripId);

  // Stop showing generating state once we have ideas
  useEffect(() => {
    if (ideas.length > 0 && isGenerating) {
      setIsGenerating(false);
      localStorage.removeItem('generating-suggestions');
    }
  }, [ideas.length, isGenerating]);

  const handleTripCreated = (newTripId: string) => {
    // Save to localStorage
    localStorage.setItem('current-trip-id', newTripId);
    localStorage.setItem('generating-suggestions', 'true');
    setTripId(newTripId);
    setIsGenerating(true);
  };

  // Show trip planning form if no trip
  if (!trip && tripId === null && member) {
    return (
      <TripPlanningForm
        createTripMutation={createTripMutation}
        memberId={member.id}
        onSuccess={handleTripCreated}
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

  // Calculate map center from trip or ideas
  const mapCenter: [number, number] = trip?.destination_lat && trip?.destination_lng
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

