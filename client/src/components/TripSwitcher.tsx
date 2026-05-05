import { useState, useRef, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useModal } from "../contexts/ModalContext";
import { useUserTrips } from "../hooks/useUserTrips";
import { useTripSummary } from "../hooks/useTripSummary";

const PENDING_CREATE_KEY = "pending-open-create-trip";

const TRIP_ID_KEY = "current-trip-id";

function setCurrentTripId(tripId: string) {
  try {
    localStorage.setItem(TRIP_ID_KEY, tripId);
  } catch {
    // localStorage unavailable
  }
}

export function TripSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const { openModal } = useModal();
  const tripSummary = useTripSummary();
  const { data: trips = [], isLoading } = useUserTrips(profile?.id ?? null);

  const activeTrips = trips;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (tripId: string) => {
    setCurrentTripId(tripId);
    setIsOpen(false);
  };

  const navigate = useNavigate();
  const { location } = useRouterState();

  const handleCreateTrip = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(PENDING_CREATE_KEY, "1");
    } catch {
      // ignore
    }
    if (location.pathname !== "/pretrip") {
      navigate({ to: "/pretrip" });
    } else {
      openModal("createTrip");
    }
  };

  const displayLabel = tripSummary?.title || tripSummary?.destination || "Select trip";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors min-w-[120px]"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[3000] min-w-[200px] max-h-[280px] overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-gray-500">Loading...</div>
          ) : activeTrips.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">
              No trips yet
            </div>
          ) : (
            activeTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => handleSelect(trip.id)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors ${
                  trip.id === tripSummary?.id ? "bg-gray-50 font-medium" : ""
                }`}
              >
                {trip.title || trip.destination}
              </button>
            ))
          )}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={handleCreateTrip}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Plus size={14} />
              Create new trip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
