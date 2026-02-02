"use client";

import { Button } from "../ui/button";
import { useModals } from "../../contexts/ModalContext";
import { Settings, MapPin, Plus } from "lucide-react";
import { TripSelector } from "../TripSelector";
import { TripMembersAvatars } from "../TripMembersAvatars";
import { useCurrentTrip } from "../../hooks/useCurrentTrip";
import { useUserTrips } from "../../hooks/useUserTrips";
import { useMember } from "../../contexts/MemberContext";
import { Database } from "@travel-app/shared-types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

interface TripHeaderProps {
  trip: Trip | null;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const { openModal } = useModals();
  const { member } = useMember();
  const { setCurrentTrip } = useCurrentTrip();
  const {
    data: userTrips = [],
    isLoading: tripsLoading,
    error: tripsError,
  } = useUserTrips(member?.id || null);

  const handleTripSelect = (tripId: string) => {
    console.log(`🎯 TripHeader: Selecting trip ${tripId}`);
    setCurrentTrip(tripId);
  };

  if (!trip) {
    return (
      <header className="relative z-[1001] border-b bg-muted/30 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-xs">
            <TripSelector
              currentTrip={null}
              trips={userTrips}
              isLoading={tripsLoading}
              error={tripsError}
              onTripSelect={handleTripSelect}
            />
          </div>
          <Button
            onClick={() => openModal("createTrip")}
            size="sm"
            className="bg-primary hover:bg-primary/90 ml-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Trip
          </Button>
        </div>
      </header>
    );
  }

  const displayTitle = trip.title || trip.destination;

  return (
    <header className="relative z-[1001] border-b bg-background px-4 py-3 md:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Trip Selector */}
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-xs">
          <TripSelector
            currentTrip={trip}
            trips={userTrips}
            isLoading={tripsLoading}
            error={tripsError}
            onTripSelect={handleTripSelect}
          />
        </div>

        {/* Center: Trip Metadata */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-sm">
            <MapPin className="h-4 w-4" />
            <span>{trip.destination}</span>
          </div>
          {trip.start_date && trip.end_date && (
            <div className="text-sm text-muted-foreground">
              {new Date(trip.start_date).toLocaleDateString()} -{" "}
              {new Date(trip.end_date).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Trip Members Avatars */}
          <TripMembersAvatars tripId={trip.id} />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal("tripSettings")}
            className="h-9 w-9 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
