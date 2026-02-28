"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { useModals } from "../../contexts/ModalContext";
import { useMember } from "../../contexts/MemberContext";
import { useCreateTrip } from "../../hooks/useTrip";
import { useCurrentTrip } from "../../hooks/useCurrentTrip";
import { mapBudgetLevelToDatabase } from "../../lib/utils";
import { X, MapPin, Users, DollarSign } from "lucide-react";
import { DateRangePicker } from "../DateRangePicker";
import { searchPlaces, PlaceSearchResult } from "../../lib/place-search";

export function CreateTripModal() {
  const { isOpen, closeModal } = useModals();
  const { member } = useMember();
  const createTripMutation = useCreateTrip();
  const { handleTripCreated } = useCurrentTrip();

  const [formData, setFormData] = useState({
    destination: "",
    title: "",
    startDate: "",
    endDate: "",
    budgetLevel: "medium" as "low" | "medium" | "high",
    interests: [] as string[],
  });

  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(
    null,
  );
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !formData.destination.trim()) return;

    setIsSubmitting(true);
    try {
      const tripData = {
        destination: selectedPlace?.displayName || formData.destination.trim(),
        destination_lat: selectedPlace?.lat || null,
        destination_lng: selectedPlace?.lng || null,
        title: formData.title.trim() || null,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        budget_level: mapBudgetLevelToDatabase(formData.budgetLevel),
        interests: formData.interests.length > 0 ? formData.interests : null,
        created_by: member.id,
      };

      const newTrip = await createTripMutation.mutateAsync(tripData);

      // Calculate duration for AI context
      let durationDays = null;
      if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      // Store streaming input so TripView can pick it up and start SSE
      const suggestionInput = {
        tripId: newTrip.id,
        destination: tripData.destination,
        durationDays,
        budgetLevel: formData.budgetLevel,
        interests: formData.interests.length > 0 ? formData.interests : null,
        createdBy: member.id,
      };
      localStorage.setItem("generating-suggestions", "true");
      localStorage.setItem(
        "pending-suggestion-input",
        JSON.stringify(suggestionInput),
      );

      // Use the enhanced trip management to handle the new trip
      handleTripCreated(newTrip);

      handleClose();
    } catch (error) {
      console.error("Failed to create trip:", error);
      // Error handling is managed by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    closeModal("createTrip");
    setFormData({
      destination: "",
      title: "",
      startDate: "",
      endDate: "",
      budgetLevel: "medium",
      interests: [],
    });
    setSelectedPlace(null);
    setSearchResults([]);
    setShowResults(false);
    setIsSubmitting(false);
  };

  const handleDestinationChange = (value: string) => {
    setFormData((prev) => ({ ...prev, destination: value }));
    setSelectedPlace(null);

    if (searchTimeout) clearTimeout(searchTimeout);

    if (value.trim().length > 2) {
      const timeout = setTimeout(() => {
        setIsSearching(true);
        searchPlaces(value)
          .then((results) => {
            setSearchResults(results);
            setShowResults(true);
          })
          .catch(() => setSearchResults([]))
          .finally(() => setIsSearching(false));
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectPlace = (result: PlaceSearchResult) => {
    setSelectedPlace(result);
    setFormData((prev) => ({ ...prev, destination: result.displayName }));
    setShowResults(false);
  };

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const availableInterests = [
    "culture",
    "food",
    "nature",
    "adventure",
    "relaxation",
    "nightlife",
    "shopping",
    "history",
    "art",
    "photography",
  ];

  if (!isOpen("createTrip")) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transform transition-[transform,opacity] duration-300 scale-100 opacity-100">
        {/* Header */}
        <div className="border-b border-border px-6 py-5 flex items-center justify-between flex-shrink-0 bg-background">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Create New Trip
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Plan your next adventure
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Destination */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destination *
              </label>
              <div className="relative">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Where are you going?"
                    value={formData.destination}
                    onChange={(e) => handleDestinationChange(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0 && !selectedPlace)
                        setShowResults(true);
                    }}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                    className="w-full pl-9 pr-10 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-[border-color,box-shadow]"
                    required
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                    </div>
                  )}
                </div>
                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectPlace(result)}
                        className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors border-b last:border-b-0 flex items-start gap-2 text-sm"
                      >
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
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

            {/* Trip Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Trip Title (Optional)
              </label>
              <input
                type="text"
                placeholder="Give your trip a name"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-[border-color,box-shadow]"
              />
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Start and end date</label>
              <DateRangePicker
                startDate={formData.startDate}
                endDate={formData.endDate}
                onStartChange={(value) =>
                  setFormData((prev) => ({ ...prev, startDate: value }))
                }
                onEndChange={(value) =>
                  setFormData((prev) => ({ ...prev, endDate: value }))
                }
                compact
              />
            </div>

            {/* Budget Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "low", label: "Budget", desc: "Affordable options" },
                  {
                    value: "medium",
                    label: "Moderate",
                    desc: "Balanced spending",
                  },
                  {
                    value: "high",
                    label: "Luxury",
                    desc: "Premium experiences",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        budgetLevel: option.value as any,
                      }))
                    }
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      formData.budgetLevel === option.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Interests (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableInterests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.interests.includes(interest)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0 bg-background">
            <div className="text-sm text-muted-foreground">
              {formData.destination.trim()
                ? "Ready to create your trip"
                : "Enter a destination to continue"}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.destination.trim() || isSubmitting}
                className="px-6 font-semibold"
              >
                {isSubmitting ? "Creating..." : "Create Trip"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
