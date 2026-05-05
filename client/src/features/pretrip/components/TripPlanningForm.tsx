import { useEffect, useState } from "react";
import { UseMutationResult } from "@tanstack/react-query";
import { motion } from "motion/react";
import { searchPlaces, PlaceSearchResult } from "../lib/place-search";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { MapPin, Sparkles } from "lucide-react";
import { Database, TablesInsert } from "@/types";
import { TripSuggestionInput } from "../hooks/useStreamingSuggestions";
import { PhotoCollage } from "./PhotoCollage";
import { DateRangePicker } from "./DateRangePicker";

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
  { value: "$" as const, label: "$", description: "Budget-friendly" },
  { value: "$$" as const, label: "$$", description: "Moderate" },
  { value: "$$$" as const, label: "$$$", description: "Luxury" },
];

const INTEREST_OPTIONS = [
  { label: "Relaxing", emoji: "\u{1F9D8}" },
  { label: "Nature", emoji: "\u{1F333}" },
  { label: "Food & Drink", emoji: "\u{1F37D}\uFE0F" },
  { label: "History", emoji: "\u{1F3DB}\uFE0F" },
  { label: "Adventure", emoji: "\u26F0\uFE0F" },
  { label: "Nightlife", emoji: "\u{1F378}" },
  { label: "Culture", emoji: "\u{1F3AD}" },
  { label: "Museum", emoji: "\u{1F5BC}\uFE0F" },
  { label: "Outdoors", emoji: "\u{1F3D5}\uFE0F" },
  { label: "Beaches", emoji: "\u{1F3D6}\uFE0F" },
];

const INSPIRATION_PHOTOS = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=600&q=80",
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?w=600&q=80",
];

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.1 + i * 0.08, ease: "easeOut" as const },
});

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

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetLevel, setBudgetLevel] = useState<"$" | "$$" | "$$$" | null>(
    null,
  );
  const [interests, setInterests] = useState<string[]>([]);

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

    let durationDays: number | null = null;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    const tripData: TripInsert = {
      destination: selectedPlace?.displayName || destination.trim(),
      destination_lat: selectedPlace?.lat || null,
      destination_lng: selectedPlace?.lng || null,
      created_by: memberId,
      title: `Trip to ${selectedPlace?.name || destination.trim()}`,
      start_date: startDate || null,
      end_date: endDate || null,
      duration_days: durationDays,
      budget_level: budgetLevel || null,
      interests: interests.length > 0 ? interests : null,
    };

    try {
      const result = await createTripMutation.mutateAsync(tripData);

      const suggestionInput: TripSuggestionInput = {
        tripId: result.id,
        destination: selectedPlace?.displayName || destination.trim(),
        durationDays,
        budgetLevel: budgetLevel || null,
        interests: interests.length > 0 ? interests : null,
        createdBy: memberId,
      };

      onSuccess(result.id, suggestionInput);
    } catch (error) {
      console.error("Failed to create trip:", error);
      alert("Failed to create trip. Please try again.");
    }
  };

  const isFormValid = destination.trim().length > 0;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-accent/5 min-h-0">
      <div className="flex-1 grid lg:grid-cols-[1fr_0.85fr] items-start min-h-0">
        {/* Left: Form — scrollable when content overflows */}
        <div className="flex justify-center px-4 lg:px-12 py-6 lg:py-8 overflow-y-auto min-h-0">
          <div className="w-full max-w-xl space-y-6 lg:space-y-7 py-2">
            {/* Header */}
            <motion.div className="space-y-1.5" {...stagger(0)}>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                Let's plan your trip
              </h1>
              <p className="text-muted-foreground text-base lg:text-lg">
                You don't need a full plan yet. Start with ideas
              </p>
            </motion.div>

            {/* Form Fields */}
            <div className="space-y-5 lg:space-y-6">
              {/* Destination Input */}
              <motion.div className="space-y-2" {...stagger(1)}>
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
                        setTimeout(() => setShowResults(false), 200);
                      }}
                      className="pl-10 pr-10 h-11 lg:h-12 text-base border rounded-xl shadow-sm"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                      </div>
                    )}
                  </div>

                  {showResults && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-background border rounded-xl shadow-lg max-h-80 overflow-y-auto">
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
              </motion.div>

              {/* Date Inputs */}
              <motion.div className="space-y-2" {...stagger(2)}>
                <label className="text-sm font-medium" id="when-are-you-going">
                  When are you going?
                </label>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartChange={setStartDate}
                  onEndChange={setEndDate}
                  minDate={new Date(new Date().setHours(0, 0, 0, 0))}
                  labelId="when-are-you-going"
                  inputClassName="h-11 lg:h-12"
                />
              </motion.div>

              {/* Budget Selection */}
              <motion.div className="space-y-2" {...stagger(3)}>
                <label className="text-sm font-medium">
                  What is your budget?
                </label>
                <div className="flex gap-3">
                  {BUDGET_OPTIONS.map((option) => (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => setBudgetLevel(option.value)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`flex-1 py-2.5 lg:py-3 rounded-xl border-2 transition-colors font-medium flex flex-col items-center gap-0.5 ${
                        budgetLevel === option.value
                          ? "border-primary bg-primary/5"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      <span className="text-lg">{option.label}</span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {option.description}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Interests Selection */}
              <motion.div className="space-y-2" {...stagger(4)}>
                <label className="text-sm font-medium">
                  What are your interests?
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <motion.button
                      key={interest.label}
                      type="button"
                      onClick={() => toggleInterest(interest.label)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        interests.includes(interest.label)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:border-primary/50"
                      }`}
                    >
                      <span className="mr-1.5">{interest.emoji}</span>
                      {interest.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Submit Button */}
              <motion.div {...stagger(5)}>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormValid || createTripMutation.isPending}
                    className="w-full h-14 lg:h-16 text-base lg:text-lg font-semibold rounded-xl"
                    size="lg"
                  >
                    {createTripMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Creating trip...</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Show me ideas
                      </span>
                    )}
                  </Button>
                </motion.div>

                <p className="text-center text-sm text-muted-foreground mt-3">
                  You can change this later.
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Right: Photo Collage (hidden on mobile, visible on lg+) */}
        <div className="hidden lg:flex items-center justify-center p-8 lg:p-12">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <PhotoCollage photos={INSPIRATION_PHOTOS} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
