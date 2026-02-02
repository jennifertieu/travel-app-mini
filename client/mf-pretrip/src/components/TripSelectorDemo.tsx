import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TripSelector } from "./TripSelector";
import { useUserTrips } from "../hooks/useUserTrips";
import { useCurrentTrip } from "../hooks/useCurrentTrip";
import { Tables } from "@travel-app/shared-types";

type Trip = Tables<"trips">;

// Create a query client for the demo
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function TripSelectorDemoInner() {
  const { currentTrip, setCurrentTrip, handleTripCreated } = useCurrentTrip();
  const { data: trips = [], isLoading, error } = useUserTrips("demo-user-id");

  const handleTripSelect = (tripId: string) => {
    console.log("Trip selected:", tripId);
    setCurrentTrip(tripId);
  };

  const handleCreateTrip = () => {
    console.log("Create trip clicked");
    // In a real app, this would open the trip creation modal
    // For demo purposes, we'll create a mock trip
    const mockTrip: Trip = {
      id: `trip-${Date.now()}`,
      title: "New Trip",
      destination: "Demo Destination",
      created_by: "demo-user-id",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      start_date: null,
      end_date: null,
      destination_lat: null,
      destination_lng: null,
      duration_days: null,
      budget_level: null,
      interests: null,
    };
    handleTripCreated(mockTrip);
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">TripSelector Demo</h2>
      <TripSelector
        currentTrip={currentTrip}
        trips={trips}
        isLoading={isLoading}
        error={error}
        onTripSelect={handleTripSelect}
        onCreateTrip={handleCreateTrip}
      />

      {/* Debug info */}
      <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
        <p>
          <strong>Current Trip:</strong>{" "}
          {currentTrip?.title || currentTrip?.destination || "None"}
        </p>
        <p>
          <strong>Total Trips:</strong> {trips.length}
        </p>
        <p>
          <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
        </p>
        <p>
          <strong>Error:</strong> {error?.message || "None"}
        </p>
      </div>
    </div>
  );
}

export function TripSelectorDemo() {
  return (
    <QueryClientProvider client={queryClient}>
      <TripSelectorDemoInner />
    </QueryClientProvider>
  );
}
