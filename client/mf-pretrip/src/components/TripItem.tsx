import React, { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/utils";
import { Tables } from "@travel-app/shared-types";

type Trip = Tables<"trips">;

interface TripItemProps {
  trip: Trip;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  className?: string;
}

export const TripItem = React.forwardRef<HTMLButtonElement, TripItemProps>(
  (
    {
      trip,
      isSelected,
      isFocused,
      onClick,
      onKeyDown,
      onMouseEnter,
      onMouseLeave,
      className,
    },
    ref,
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const displayTitle = trip.title || trip.destination;
    const dateRange = formatDateRange(trip.start_date, trip.end_date);

    // Focus management for keyboard navigation
    useEffect(() => {
      if (isFocused && buttonRef.current) {
        buttonRef.current.focus();
      }
    }, [isFocused]);

    // Combine refs
    const combinedRef = (node: HTMLButtonElement) => {
      buttonRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <button
        ref={combinedRef}
        type="button"
        onClick={onClick}
        onKeyDown={onKeyDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none transition-colors",
          isFocused && "bg-accent text-accent-foreground",
          isSelected && "bg-primary/10 text-primary",
          className,
        )}
        role="option"
        aria-selected={isSelected}
        aria-label={`${displayTitle}${dateRange ? `, ${dateRange}` : ""}${isSelected ? " (currently selected)" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{displayTitle}</span>
              {isSelected && (
                <Check
                  className="h-4 w-4 text-primary flex-shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>
            {dateRange && (
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {dateRange}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  },
);

TripItem.displayName = "TripItem";

// Helper function to format date range
function formatDateRange(
  startDate: string | null,
  endDate: string | null,
): string | null {
  if (!startDate && !endDate) return null;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? "numeric"
            : undefined,
      });
    } catch {
      return dateString;
    }
  };

  if (startDate && endDate) {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  } else if (startDate) {
    return `From ${formatDate(startDate)}`;
  } else if (endDate) {
    return `Until ${formatDate(endDate)}`;
  }

  return null;
}
