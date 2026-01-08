"use client";

import { useEffect, useState } from "react";
import { useTrip } from "../hooks/useTrip";
import { useIdeas } from "../hooks/useIdeas";
import { TripHeader } from "../components/layout/TripHeader";
import { IdeaSidebar } from "../components/layout/IdeaSidebar";
import { MapView } from "../components/layout/MapView";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useCreateTrip } from "../hooks/useTrip";
import { useMember } from "../contexts/MemberContext";
import { v4 as uuidv4 } from "uuid";
import { searchPlaces, PlaceSearchResult } from "../lib/place-search";
import { Search, MapPin } from "lucide-react";

export function TripView() {
  const { member } = useMember();
  const [tripId, setTripId] = useState<string | null>(null);
  const createTripMutation = useCreateTrip();

  // Load trip ID from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTripId = localStorage.getItem('current-trip-id');
      setTripId(storedTripId);
    }
  }, []);

  const { data: trip, isLoading: tripLoading } = useTrip(tripId);
  const { data: ideas = [], isLoading: ideasLoading } = useIdeas(tripId);

  // Temp state for creating trip
  const [destination, setDestination] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (destination.trim().length > 2) {
        setIsSearching(true);
        searchPlaces(destination)
          .then((results) => {
            setSearchResults(results);
            setShowResults(true);
          })
          .catch((error) => {
            console.error("Search error:", error);
            setSearchResults([]);
          })
          .finally(() => {
            setIsSearching(false);
          });
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [destination]);

  const handleSelectDestination = async (result: PlaceSearchResult) => {
    if (!member) return;

    const newTripId = uuidv4();
    
    try {
      await createTripMutation.mutateAsync({
        id: newTripId,
        destination: result.displayName,
        destination_lat: result.lat,
        destination_lng: result.lng,
        created_by: member.id,
        title: `Trip to ${result.name}`,
      });

      // Save to localStorage
      localStorage.setItem('current-trip-id', newTripId);
      setTripId(newTripId);
      setDestination("");
      setSearchResults([]);
      setShowResults(false);
    } catch (error) {
      console.error('Failed to create trip:', error);
      alert('Failed to create trip. Please try again.');
    }
  };

  const handleCreateTrip = async () => {
    if (!destination.trim() || !member) return;

    // If we have search results, use the first one
    if (searchResults.length > 0) {
      await handleSelectDestination(searchResults[0]);
      return;
    }

    // Otherwise, create trip without coordinates
    const newTripId = uuidv4();
    
    try {
      await createTripMutation.mutateAsync({
        id: newTripId,
        destination: destination.trim(),
        created_by: member.id,
        title: `Trip to ${destination.trim()}`,
      });

      // Save to localStorage
      localStorage.setItem('current-trip-id', newTripId);
      setTripId(newTripId);
    } catch (error) {
      console.error('Failed to create trip:', error);
      alert('Failed to create trip. Please try again.');
    }
  };

  // Show destination search immediately if no trip
  if (!trip && tripId === null) {
    return (
      <div className="h-full flex flex-col bg-background">
        <TripHeader trip={null} />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-xl space-y-3">
            <label className="text-sm text-muted-foreground block">
              Where would you like to go?
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Where to?"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateTrip()}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowResults(true);
                  }}
                  onBlur={() => {
                    // Delay to allow click on results
                    setTimeout(() => setShowResults(false), 200);
                  }}
                  className="pl-10 pr-10 h-12 text-base border-0 shadow-sm"
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
                  </div>
                )}
              </div>

              {showResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-sm max-h-80 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectDestination(result)}
                      className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors border-b last:border-b-0 flex items-start gap-2 text-sm"
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{result.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {result.displayName}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showResults && searchResults.length === 0 && destination.trim().length > 2 && !isSearching && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-sm p-3 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Loading state - show after we know there's a tripId
  if (tripLoading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <TripHeader trip={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
            <p className="text-muted-foreground">Loading trip...</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate map center from trip or ideas
  const mapCenter: [number, number] = trip?.destination_lat && trip?.destination_lng
    ? [trip.destination_lat, trip.destination_lng]
    : [40.7128, -74.006]; // Default NYC

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <TripHeader trip={trip || null} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1">
          <MapView ideas={ideas} center={mapCenter} />
        </div>

        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 overflow-hidden">
          <IdeaSidebar ideas={ideas} isLoading={ideasLoading} />
        </div>
      </div>
    </div>
  );
}

