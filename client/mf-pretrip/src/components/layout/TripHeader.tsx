"use client";

import { Button } from "../ui/button";
import { useModals } from "../../contexts/ModalContext";
import { Settings, MapPin, Plus } from "lucide-react";
import { TripSelector } from "../TripSelector";
import { TripMembersAvatars } from "../TripMembersAvatars";
import { useUserTrips } from "../../hooks/useUserTrips";
import { useMember } from "../../contexts/MemberContext";
import { Database } from "@travel-app/shared-types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];

interface TripHeaderProps {
  trip: Trip | null;
  onTripSelect: (tripId: string) => void;
}

export function TripHeader({ trip, onTripSelect }: TripHeaderProps) {
  const { openModal } = useModals();
  const { member } = useMember();
  const {
    data: userTrips = [],
    isLoading: tripsLoading,
    error: tripsError,
  } = useUserTrips(member?.id || null);

  const handleTripSelect = (tripId: string) => {
    console.log(`🎯 TripHeader: Selecting trip ${tripId}`);
    onTripSelect(tripId);
  };

  if (!trip) {
    return (
      <header className="relative z-[1001] border-b bg-background/80 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 max-w-xs">
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
            className="bg-primary hover:bg-primary/90 h-9 px-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Trip
          </Button>
        </div>
      </header>
    );
  }

  const displayTitle = trip.title || trip.destination;
  const showDestinationChip =
    Boolean(trip.destination) && trip.destination !== displayTitle;

  return (
    <header className="relative z-[1001] border-b bg-background/80 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 max-w-xs">
            <TripSelector
              currentTrip={trip}
              trips={userTrips}
              isLoading={tripsLoading}
              error={tripsError}
              onTripSelect={handleTripSelect}
            />
          </div>
          <div className="hidden md:flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {showDestinationChip && (
              <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{trip.destination}</span>
              </div>
            )}
            {trip.start_date && trip.end_date && (
              <div className="inline-flex items-center rounded-full border border-border/60 bg-background px-2 py-1">
                <span>
                  {new Date(trip.start_date).toLocaleDateString()} —{" "}
                  {new Date(trip.end_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TripMembersAvatars tripId={trip.id} className="hidden sm:flex" />
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
