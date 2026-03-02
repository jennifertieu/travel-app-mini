"use client";

import { Button } from "../ui/button";
import { useModals } from "../../contexts/ModalContext";
import { Settings, Plus } from "lucide-react";
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
    onTripSelect(tripId);
  };

  return (
    <header className="relative z-[1001] border-b bg-background/80 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 max-w-xs -ml-2">
          <TripSelector
            currentTrip={trip}
            trips={userTrips}
            isLoading={tripsLoading}
            error={tripsError}
            onTripSelect={handleTripSelect}
          />
        </div>
        <div className="flex items-center gap-2">
          {trip && (
            <>
              <TripMembersAvatars tripId={trip.id} className="hidden sm:flex" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openModal("tripSettings")}
                className="h-9 w-9 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
          {!trip && (
            <Button
              onClick={() => openModal("createTrip")}
              size="sm"
              className="bg-primary hover:bg-primary/90 h-9 px-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Trip
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
