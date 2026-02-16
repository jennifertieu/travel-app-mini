import { useEffect, useState } from "react";
import { UseMutationResult } from "@tanstack/react-query";
import { searchPlaces, PlaceSearchResult } from "../lib/place-search";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, MapPin, Calendar } from "lucide-react";
import { Database, TablesInsert } from "@travel-app/shared-types";
import { TripSuggestionInput } from "../hooks/useStreamingSuggestions";

type TripInsert = TablesInsert<"trips">;

interface TripPlanningFormProps {
  createTripMutation: UseMutationResult<
    Database["public"]["Tables"]["trips"]["Row"],
    Error,
    TripInsert,
    unknown
  >;
  memberId: string;
  onSuccess: (tripId: string, suggestionInput: TripSuggestionInput) => void;
}

const BUDGET_OPTIONS = [
  { value: "$" as const, label: "$", description: "Budget" },
  { value: "$$" as const, label: "$$", description: "Moderate" },
  { value: "$$$" as const, label: "$$$", description: "Luxury" },
];

const INTEREST_OPTIONS = [
  "Relaxing",
  "Nature",
  "Food & Drink",
  "History",
  "Adventure",
  "Nightlife",
  "Culture",
  "Museum",
  "Outdoors",
  "Beaches",
];

export function TripPlanningForm({
  createTripMutation,
  memberId,
  onSuccess,
}: TripPlanningFormProps) {
  const [destination, setDestination] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(
    null,
  );
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [durationDays, setDurationDays] = useState<number | "">("");
  const [budgetLevel, setBudgetLevel] = useState<"$" | "$$" | "$$$" | null>(
    null,
  );
  const [interests, setInterests] = useState<string[]>([]);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (destination.trim().length > 2 && !selectedPlace) {
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
  }, [destination, selectedPlace]);

  const handleSelectDestination = (result: PlaceSearchResult) => {
    setSelectedPlace(result);
    setDestination(result.displayName);
    setShowResults(false);
  };

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    setSelectedPlace(null);
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const handleSubmit = async () => {
    if (!destination.trim()) {
      alert("Please enter a destination");
      return;
    }

    const tripData: TripInsert = {
      destination: selectedPlace?.displayName || destination.trim(),
      destination_lat: selectedPlace?.lat || null,
      destination_lng: selectedPlace?.lng || null,
      created_by: memberId,
      title: `Trip to ${selectedPlace?.name || destination.trim()}`,
      duration_days: durationDays || null,
      budget_level: budgetLevel || null,
      interests: interests.length > 0 ? interests : null,
    };

    try {
      const result = await createTripMutation.mutateAsync(tripData);

      const suggestionInput: TripSuggestionInput = {
        tripId: result.id,
        destination: selectedPlace?.displayName || destination.trim(),
        durationDays: typeof durationDays === "number" ? durationDays : null,
        budgetLevel: budgetLevel || null,
        interests: interests.length > 0 ? interests : null,
        createdBy: memberId,
      };

      // Show map view immediately and start streaming suggestions
      onSuccess(result.id, suggestionInput);
    } catch (error) {
      console.error("Failed to create trip:", error);
      alert("Failed to create trip. Please try again.");
    }
  };

  const isFormValid = destination.trim().length > 0;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-xl space-y-8 py-12">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold">Let's plan your trip</h1>
            <p className="text-muted-foreground">
              You don't need a full plan yet. Start with ideas
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Destination Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Where are you thinking of going?
              </label>
              <div className="relative">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Anywhere, or a place you have in mind"
                    value={destination}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0 && !selectedPlace)
                        setShowResults(true);
                    }}
                    onBlur={() => {
                      // Delay to allow click on results
                      setTimeout(() => setShowResults(false), 200);
                    }}
                    className="pl-10 pr-10 h-12 text-base border rounded-md"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
                    </div>
                  )}
                </div>

                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-80 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectDestination(result)}
                        className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors border-b last:border-b-0 flex items-start gap-2 text-sm"
                      >
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">
                            {result.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {result.displayName}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Duration Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                How many days are you planning for the trip?
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Number of days"
                  value={durationDays}
                  onChange={(e) =>
                    setDurationDays(
                      e.target.value ? parseInt(e.target.value) : "",
                    )
                  }
                  min="1"
                  className="pl-10 h-12 text-base border rounded-md"
                />
              </div>
            </div>

            {/* Budget Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                What is your budget?
              </label>
              <div className="flex gap-3">
                {BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBudgetLevel(option.value)}
                    className={`flex-1 h-12 rounded-md border-2 transition-all font-medium text-lg ${
                      budgetLevel === option.value
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                What are your interests?
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                      interests.includes(interest)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || createTripMutation.isPending}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {createTripMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating trip...</span>
                </div>
              ) : (
                "Show me ideas"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              You can change this later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
