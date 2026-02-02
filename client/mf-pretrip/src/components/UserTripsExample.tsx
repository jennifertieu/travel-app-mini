import React from "react";
import { useUserTrips } from "../hooks/useUserTrips";
import { useMember } from "../contexts/MemberContext";

/**
 * Example component demonstrating how to use the useUserTrips hook
 * This component shows all trips for the current member/user
 */
export function UserTripsExample() {
  const { member } = useMember();
  const { data: trips, isLoading, error } = useUserTrips(member?.id || null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Loading trips...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive/20 rounded-md bg-destructive/5">
        <h3 className="text-sm font-medium text-destructive">
          Error loading trips
        </h3>
        <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
      </div>
    );
  }

  if (!trips || trips.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-muted-foreground">
          No trips yet
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first trip to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Trips</h2>
      <div className="grid gap-4">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="p-4 border rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">
                  {trip.title || `Trip to ${trip.destination}`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {trip.destination}
                </p>
                {trip.duration_days && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {trip.duration_days} days
                  </p>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(trip.created_at).toLocaleDateString()}
              </div>
            </div>
            {trip.interests && trip.interests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {trip.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
