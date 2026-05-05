import { useMember } from "../contexts/MemberContext";
import { useUserTrips } from "../hooks/useUserTrips";
import { TripCard } from "../components/TripCard";

export function TripsListView() {
  const { member } = useMember();
  const { data: trips = [], isLoading, error } = useUserTrips(member.id);

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-foreground mb-4">
        Your Plans/Trips
      </h2>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-lg p-4 animate-pulse"
            >
              <div className="w-full aspect-[4/3] bg-muted rounded-md mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="flex gap-3">
                <div className="flex-1 h-10 bg-muted rounded-md" />
                <div className="flex-1 h-10 bg-muted rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-destructive">
          <p>Failed to load trips. Please try again.</p>
        </div>
      )}

      {!isLoading && !error && trips.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No trips yet</p>
          <p className="text-sm mt-1">
            Create a trip in the Pre-Trip planner to get started.
          </p>
        </div>
      )}

      {!isLoading && !error && trips.length > 0 && (
        <div className="space-y-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
