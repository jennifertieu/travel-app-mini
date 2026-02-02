import React, { useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import { Tables } from "@travel-app/shared-types";
import { CollaborativeTrip } from "../hooks/useUserTrips";

type Trip = Tables<"trips">;

interface TripDropdownContentProps {
  trips: CollaborativeTrip[];
  currentTripId: string | null;
  isLoading: boolean;
  error: Error | null;
  isOpen: boolean;
  onTripSelect: (tripId: string) => void;
  onCreateTrip: () => void;
  onClose: () => void;
  focusedIndex: number | null;
  onFocusChange: (index: number | null) => void;
  className?: string;
  children?: React.ReactNode;
}

export const TripDropdownContent = React.forwardRef<
  HTMLDivElement,
  TripDropdownContentProps
>(
  (
    {
      trips,
      currentTripId,
      isLoading,
      error,
      isOpen,
      onTripSelect,
      onCreateTrip,
      onClose,
      focusedIndex,
      onFocusChange,
      className,
      children,
    },
    ref,
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const createTripButtonRef = useRef<HTMLButtonElement>(null);

    // Handle click outside to close dropdown
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(event.target as Node)
        ) {
          onClose();
        }
      };

      const handleEscapeKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onClose();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }, [isOpen, onClose]);

    // Focus management for keyboard navigation
    useEffect(() => {
      if (!isOpen) return;

      if (focusedIndex === -1 && createTripButtonRef.current) {
        createTripButtonRef.current.focus();
      }
    }, [focusedIndex, isOpen]);

    // Combine refs
    const combinedRef = (node: HTMLDivElement) => {
      contentRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    if (!isOpen) return null;

    return (
      <div
        ref={combinedRef}
        className={cn(
          "absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-80 overflow-hidden",
          className,
        )}
        role="listbox"
        aria-label="Trip selection menu"
      >
        <div className="overflow-y-auto max-h-80">
          {/* Create New Trip Option */}
          <button
            ref={createTripButtonRef}
            type="button"
            onClick={onCreateTrip}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onCreateTrip();
              }
            }}
            className={cn(
              "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none border-b border-border",
              focusedIndex === -1 && "bg-accent text-accent-foreground",
            )}
            role="option"
            aria-selected={false}
            onMouseEnter={() => onFocusChange(-1)}
            onMouseLeave={() => onFocusChange(null)}
          >
            <span className="font-medium text-primary">+ Create New Trip</span>
          </button>

          {/* Loading State */}
          {isLoading && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground mx-auto mb-2"></div>
              Loading trips...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="px-3 py-4 text-center text-sm text-destructive">
              <p className="mb-2">Failed to load trips</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-xs underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && trips.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No trips found. Create your first trip above.
            </div>
          )}

          {/* Trip List */}
          {!isLoading && !error && trips.length > 0 && children}
        </div>
      </div>
    );
  },
);

TripDropdownContent.displayName = "TripDropdownContent";
