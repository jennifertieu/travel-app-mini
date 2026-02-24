import { useNavigate } from "@tanstack/react-router";
import { CollaborativeTrip } from "../hooks/useUserTrips";

interface TripCardProps {
  trip: CollaborativeTrip;
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TripCard({ trip }: TripCardProps) {
  const navigate = useNavigate();
  const destination = capitalizeWords(trip.title || trip.destination);
  const days = trip.duration_days ?? "?";
  const people = trip.member_count + 1; // +1 for the owner
  const places = 0; // TODO: compute from trip_itineraries

  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden">
      {/* Image Placeholder */}
      <div className="mx-4 mt-4">
        <div className="w-full rounded-md" style={{ aspectRatio: "4/3", backgroundColor: "#e5e5e5" }} />
      </div>

      {/* Metadata */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-sm font-medium" style={{ color: "#0a0a0a" }}>
          {destination}
          {" \u00B7 "}
          {days} days
          {" \u00B7 "}
          {people} {people === 1 ? "person" : "people"}
          {" \u00B7 "}
          {places} places
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-4 pb-4">
        <button
          className="flex-1 py-2.5 text-sm font-medium rounded-md transition-colors"
          style={{ color: "#000", backgroundColor: "#fff", border: "1px solid #000" }}
          onClick={() => {
            // TODO: View Trip
            console.log("View Trip:", trip.id);
          }}
        >
          View Trip
        </button>
        <button
          className="flex-1 py-2.5 text-sm font-medium rounded-md transition-opacity hover:opacity-90"
          style={{ color: "#fff", backgroundColor: "#000" }}
          onClick={() => navigate({ to: "/trip/$tripId", params: { tripId: trip.id } })}
        >
          Start Trip
        </button>
      </div>
    </div>
  );
}
