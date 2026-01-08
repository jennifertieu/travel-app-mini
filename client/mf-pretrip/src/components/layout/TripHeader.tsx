"use client";

import { Button } from "../ui/button";
import { useModals } from "../../contexts/ModalContext";
import { Settings, MapPin, Plus } from "lucide-react";

interface TripHeaderProps {
  trip: {
    id: string;
    title?: string | null;
    destination: string;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const { openModal } = useModals();

  if (!trip) {
    return (
      <header className="border-b bg-muted/30 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Travel Itinerary</h1>
          <Button
            onClick={() => openModal("createTrip")}
            size="sm"
            className="bg-primary hover:bg-primary/90"
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
    <header className="border-b bg-background px-4 py-3 md:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Trip Title */}
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl font-semibold truncate">{displayTitle}</h1>
        </div>

        {/* Center: Trip Metadata */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-background text-sm">
            <MapPin className="h-4 w-4" />
            <span>{trip.destination}</span>
          </div>
          {trip.start_date && trip.end_date && (
            <div className="text-sm text-muted-foreground">
              {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
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

