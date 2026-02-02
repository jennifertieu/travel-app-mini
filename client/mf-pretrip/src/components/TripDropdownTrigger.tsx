import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { Tables } from "@travel-app/shared-types";

type Trip = Tables<"trips">;

interface TripDropdownTriggerProps {
  currentTrip: Trip | null;
  isOpen: boolean;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  className?: string;
}

export const TripDropdownTrigger = React.forwardRef<
  HTMLButtonElement,
  TripDropdownTriggerProps
>(({ currentTrip, isOpen, onClick, onKeyDown, className }, ref) => {
  const displayText =
    currentTrip?.title || currentTrip?.destination || "Select Trip";

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex items-center justify-between w-full px-3 py-2 text-left bg-background border border-input rounded-md shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
        isOpen && "ring-2 ring-ring ring-offset-2",
        className,
      )}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-label={
        currentTrip
          ? `Current trip: ${displayText}. Click to select a different trip.`
          : "Select a trip"
      }
    >
      <span className="block truncate text-sm font-medium">{displayText}</span>
      <ChevronDown
        className={cn(
          "ml-2 h-4 w-4 transition-transform duration-200",
          isOpen && "rotate-180",
        )}
        aria-hidden="true"
      />
    </button>
  );
});

TripDropdownTrigger.displayName = "TripDropdownTrigger";
