"use client";

import { Button } from "../ui/button";
import { useModals } from "../../contexts/ModalContext";
import {
  Settings,
  Plus,
  Vote,
  Sparkles,
  Loader2,
  Calendar,
} from "lucide-react";
import { TripSelector } from "../TripSelector";
import { TripMembersAvatars } from "../TripMembersAvatars";
import { useUserTrips } from "../../hooks/useUserTrips";
import { useMember } from "../../contexts/MemberContext";
import { useIdeas } from "../../hooks/useIdeas";
import { useMyReactions } from "../../hooks/useMyReactions";
import { useStartItineraryBuild } from "../../hooks/useStartItineraryBuild";
import { Database } from "@travel-app/shared-types";

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameMonth = start.getMonth() === end.getMonth();
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return sameMonth
    ? `${fmt(start)} – ${end.getDate()}`
    : `${fmt(start)} – ${fmt(end)}`;
}

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
      <header className="relative z-[1001] border-b bg-background/80 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 max-w-xs -ml-2">
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

  const { startBuild, isStarting } = useStartItineraryBuild();

  const { data: ideas = [] } = useIdeas(trip.id);
  const ratedIdeas = ideas.filter((i) => i.enrichment_status === "DONE");
  const ideaIds = ratedIdeas.map((i) => i.id);
  const { data: myReactions = {} } = useMyReactions(
    member?.id ?? null,
    ideaIds,
  );
  const unratedCount = ideaIds.filter((id) => !myReactions[id]).length;
  const ratedCount = ratedIdeas.length - unratedCount;
  const hasDates = Boolean(trip.start_date && trip.end_date);

  // CTA buttons: rate + build can appear together
  const showRateButton = ratedIdeas.length > 0 && unratedCount > 0;
  const showBuildButton = ratedCount >= 1 && hasDates;
  const showAddDatesButton = ratedCount >= 1 && !hasDates;

  const metadataParts: React.ReactNode[] = [];
  if (trip.destination) {
    metadataParts.push(trip.destination);
  }
  if (hasDates && trip.start_date && trip.end_date) {
    metadataParts.push(formatDateRange(trip.start_date, trip.end_date));
  } else {
    metadataParts.push(
      <button
        key="add-dates"
        type="button"
        onClick={() => openModal("tripSettings")}
        className="text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 underline-offset-2 hover:underline cursor-pointer"
      >
        Add dates
      </button>,
    );
  }
  if (ratedIdeas.length > 0) {
    metadataParts.push(
      <button
        key="rating"
        type="button"
        onClick={() => openModal("ratingMode")}
        className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline cursor-pointer"
      >
        {ratedCount}/{ratedIdeas.length} rated
      </button>,
    );
  }

  return (
    <header className="relative z-[1001] border-b bg-background/80 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 -ml-2">
          <div className="min-w-0 max-w-md">
            <TripSelector
              currentTrip={trip}
              trips={userTrips}
              isLoading={tripsLoading}
              error={tripsError}
              onTripSelect={handleTripSelect}
            />
          </div>
          {metadataParts.length > 0 && (
            <div className="hidden md:flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              {metadataParts.map((part, i) => (
                <span key={i} className="flex items-center gap-x-1.5">
                  {i > 0 && <span aria-hidden> · </span>}
                  {part}
                </span>
              ))}
            </div>
          )}
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
          {showRateButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openModal("ratingMode")}
              className="h-9 gap-1.5 px-3"
            >
              <Vote className="h-4 w-4" />
              <span className="hidden sm:inline">
                {unratedCount === ratedIdeas.length
                  ? "Rate Ideas"
                  : `Rate ${unratedCount} left`}
              </span>
            </Button>
          )}
          {showAddDatesButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openModal("tripSettings")}
              className="h-9 gap-1.5 px-3"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Add Dates to Build</span>
            </Button>
          )}
          {showBuildButton && (
            <Button
              size="sm"
              onClick={() => startBuild(trip.id)}
              disabled={isStarting}
              title="Build AI itinerary from your ideas"
              className="h-9 gap-1.5 px-3"
            >
              {isStarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isStarting ? "Building..." : "Build Trip"}
              </span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
