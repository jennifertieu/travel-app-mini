import React, { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "../lib/utils";
import { Tables } from "@/types";
import { TripDropdownTrigger } from "./TripDropdownTrigger";
import { TripDropdownContent } from "./TripDropdownContent";
import { TripItem } from "./TripItem";
import { useModal } from "@/contexts/ModalContext";

type Trip = Tables<"trips">;

interface TripSelectorProps {
  currentTrip: (Trip & { is_owner?: boolean; is_collaborator?: boolean; member_count?: number }) | null;
  trips: (Trip & { is_owner?: boolean; is_collaborator?: boolean; member_count?: number })[];
  isLoading: boolean;
  error: Error | null;
  onTripSelect: (tripId: string) => void;
  onCreateTrip?: () => void;
  className?: string;
}

export const TripSelector = React.forwardRef<HTMLDivElement, TripSelectorProps>(
  ({ currentTrip, trips, isLoading, error, onTripSelect, className }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { openModal } = useModal();
    const activeTrips = trips.filter(
      (trip) =>
        (trip as Trip & { deleted_at?: string | null }).deleted_at == null,
    );
    const currentTripDeletedAt = (
      currentTrip as (Trip & { deleted_at?: string | null }) | null
    )?.deleted_at;
    const resolvedCurrentTrip = currentTripDeletedAt ? null : currentTrip;

    const handleToggle = useCallback(() => {
      setIsOpen((prev) => !prev);
      if (!isOpen) {
        // Reset focus when opening
        setFocusedIndex(null);
      }
    }, [isOpen]);

    const handleClose = useCallback(() => {
      setIsOpen(false);
      setFocusedIndex(null);
      // Return focus to trigger
      triggerRef.current?.focus();
    }, []);

    const handleTripSelect = useCallback(
      (tripId: string) => {
        onTripSelect(tripId);
        handleClose();
      },
      [onTripSelect, handleClose],
    );

    const handleCreateTrip = useCallback(() => {
      openModal("createTrip");
      handleClose();
    }, [openModal, handleClose]);

    const handleFocusChange = useCallback((index: number | null) => {
      setFocusedIndex(index);
    }, []);

    // Keyboard navigation for trigger
    const handleTriggerKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        switch (event.key) {
          case "Enter":
          case " ":
          case "ArrowDown":
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              setFocusedIndex(-1); // Focus on "Create New Trip"
            } else if (event.key === "ArrowDown") {
              // Move to first trip if available, otherwise stay on create option
              setFocusedIndex(activeTrips.length > 0 ? 0 : -1);
            }
            break;
          case "ArrowUp":
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
              setFocusedIndex(activeTrips.length - 1); // Focus on last trip
            }
            break;
          case "Escape":
            if (isOpen) {
              event.preventDefault();
              handleClose();
            }
            break;
        }
      },
      [isOpen, activeTrips.length, handleClose],
    );

    // Global keyboard navigation when dropdown is open
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        // Only handle keyboard events if the dropdown is the active element or contains focus
        const activeElement = document.activeElement;
        const dropdownContainer = contentRef.current;
        const triggerElement = triggerRef.current;

        if (!dropdownContainer && !triggerElement) return;

        // Check if focus is within our dropdown system
        const isWithinDropdown =
          activeElement === triggerElement ||
          (dropdownContainer && dropdownContainer.contains(activeElement));

        if (!isWithinDropdown) return;

        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            setFocusedIndex((prev) => {
              if (prev === null) return -1; // Start with "Create New Trip"
              if (prev === -1) return activeTrips.length > 0 ? 0 : -1; // Move to first trip
              return prev < activeTrips.length - 1 ? prev + 1 : -1; // Wrap to "Create New Trip"
            });
            break;
          case "ArrowUp":
            event.preventDefault();
            setFocusedIndex((prev) => {
              if (prev === null) return activeTrips.length - 1; // Start with last trip
              if (prev === -1) return activeTrips.length - 1; // Move to last trip
              if (prev === 0) return -1; // Move to "Create New Trip"
              return prev - 1; // Move up
            });
            break;
          case "Home":
            event.preventDefault();
            setFocusedIndex(-1); // Focus "Create New Trip"
            break;
          case "End":
            event.preventDefault();
            setFocusedIndex(
              activeTrips.length > 0 ? activeTrips.length - 1 : -1,
            ); // Focus last trip or "Create New Trip"
            break;
          case "Enter":
          case " ":
            event.preventDefault();
            if (focusedIndex === -1) {
              handleCreateTrip();
            } else if (
              focusedIndex !== null &&
              focusedIndex < activeTrips.length
            ) {
              handleTripSelect(activeTrips[focusedIndex].id);
            }
            break;
          case "Escape":
            event.preventDefault();
            handleClose();
            break;
          case "Tab":
            // Allow natural tab behavior but close dropdown if tabbing away
            if (!event.shiftKey) {
              // Tabbing forward - check if we're leaving the dropdown
              setTimeout(() => {
                const newActiveElement = document.activeElement;
                if (
                  dropdownContainer &&
                  !dropdownContainer.contains(newActiveElement) &&
                  newActiveElement !== triggerElement
                ) {
                  handleClose();
                }
              }, 0);
            } else {
              // Shift+Tab - tabbing backward
              setTimeout(() => {
                const newActiveElement = document.activeElement;
                if (
                  dropdownContainer &&
                  !dropdownContainer.contains(newActiveElement) &&
                  newActiveElement !== triggerElement
                ) {
                  handleClose();
                }
              }, 0);
            }
            break;
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [
      isOpen,
      focusedIndex,
      activeTrips,
      handleTripSelect,
      handleCreateTrip,
      handleClose,
    ]);

    // Handle item keyboard events
    const handleItemKeyDown = useCallback(
      (event: React.KeyboardEvent, tripId: string) => {
        switch (event.key) {
          case "Enter":
          case " ":
            event.preventDefault();
            handleTripSelect(tripId);
            break;
        }
      },
      [handleTripSelect],
    );

    return (
      <div ref={ref} className={cn("relative", className)}>
        <TripDropdownTrigger
          ref={triggerRef}
          currentTrip={resolvedCurrentTrip}
          isOpen={isOpen}
          onClick={handleToggle}
          onKeyDown={handleTriggerKeyDown}
        />

        <TripDropdownContent
          ref={contentRef}
          trips={activeTrips as any}
          currentTripId={resolvedCurrentTrip?.id || null}
          isLoading={isLoading}
          error={error}
          isOpen={isOpen}
          onTripSelect={handleTripSelect}
          onCreateTrip={handleCreateTrip}
          onClose={handleClose}
          focusedIndex={focusedIndex}
          onFocusChange={handleFocusChange}
        >
          {/* Render trip items */}
          {activeTrips.map((trip, index) => (
            <TripItem
              key={trip.id}
              trip={trip}
              isSelected={trip.id === resolvedCurrentTrip?.id}
              isFocused={focusedIndex === index}
              onClick={() => handleTripSelect(trip.id)}
              onKeyDown={(event) => handleItemKeyDown(event, trip.id)}
              onMouseEnter={() => handleFocusChange(index)}
              onMouseLeave={() => handleFocusChange(null)}
            />
          ))}
        </TripDropdownContent>
      </div>
    );
  },
);

TripSelector.displayName = "TripSelector";
