"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { useModal } from "@/contexts/ModalContext";
import { useMember } from "../../contexts/MemberContext";
import { useCurrentTrip } from "../../hooks/useCurrentTrip";
import { useDeleteTrip, useUpdateTrip } from "../../hooks/useTrip";
import { useUserTrips } from "../../hooks/useUserTrips";
import {
  mapBudgetLevelFromDatabase,
  mapBudgetLevelToDatabase,
} from "../../lib/utils";
import { queryKeys } from "../../lib/queryKeys";
import { DollarSign, MapPin, Users, X, Trash2 } from "lucide-react";
import { DateRangePicker } from "../DateRangePicker";

export function TripSettingsModal() {
  const { isOpen, closeModal } = useModal();
  const { member } = useMember();
  const {
    currentTrip: trip,
    currentTripId,
    setCurrentTrip,
    clearCurrentTrip,
  } = useCurrentTrip();
  const { data: userTrips = [] } = useUserTrips(member?.id || null);
  const updateTripMutation = useUpdateTrip(currentTripId || "");
  const deleteTripMutation = useDeleteTrip(currentTripId || "");
  const queryClient = useQueryClient();

  const modalOpen = isOpen("tripSettings");

  const [formData, setFormData] = useState({
    destination: "",
    title: "",
    startDate: "",
    endDate: "",
    budgetLevel: "medium" as "low" | "medium" | "high",
    interests: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const activeTrips = useMemo(
    () => userTrips,
    [userTrips],
  );

  const availableInterests = useMemo(
    () => [
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
    ],
    [],
  );

  useEffect(() => {
    if (!modalOpen || !trip) return;

    setFormData({
      destination: trip.destination || "",
      title: trip.title || "",
      startDate: trip.start_date ? trip.start_date.slice(0, 10) : "",
      endDate: trip.end_date ? trip.end_date.slice(0, 10) : "",
      budgetLevel: trip.budget_level
        ? mapBudgetLevelFromDatabase(trip.budget_level as "$" | "$$" | "$$$")
        : "medium",
      interests: trip.interests || [],
    });
  }, [modalOpen, trip]);

  const handleClose = () => {
    closeModal("tripSettings");
    setIsSaving(false);
    setIsDeleting(false);
  };

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trip || !currentTripId || !formData.destination.trim()) return;

    setIsSaving(true);
    try {
      await updateTripMutation.mutateAsync({
        destination: formData.destination.trim(),
        title: formData.title.trim() || null,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        budget_level: mapBudgetLevelToDatabase(formData.budgetLevel),
        interests: formData.interests.length > 0 ? formData.interests : null,
      });

      if (member?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.userTrips(member.id),
        });
      }
      handleClose();
    } catch (error) {
      console.error("Failed to update trip:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!trip || !currentTripId) return;
    const shouldDelete = window.confirm(
      "Delete this group? This will hide the trip for everyone.",
    );
    if (!shouldDelete) return;

    setIsDeleting(true);
    try {
      await deleteTripMutation.mutateAsync();

      if (member?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.userTrips(member.id),
        });
      }

      const nextTrip = activeTrips.find(
        (candidate) => candidate.id !== currentTripId,
      );
      if (nextTrip) {
        setCurrentTrip(nextTrip.id);
      } else {
        clearCurrentTrip();
      }

      handleClose();
    } catch (error) {
      console.error("Failed to delete trip:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleClose}
      />

      <div className="relative bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transform transition-[transform,opacity] duration-300 scale-100 opacity-100">
        <div className="border-b border-border px-6 py-5 flex items-center justify-between flex-shrink-0 bg-background">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Trip Settings
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Update trip details or delete the group
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destination *
              </label>
              <input
                type="text"
                placeholder="Where are you going?"
                value={formData.destination}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    destination: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-[border-color,box-shadow]"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Trip Title (Optional)
              </label>
              <input
                type="text"
                placeholder="Give your trip a name"
                value={formData.title}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-[border-color,box-shadow]"
              />
            </div>

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

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-destructive/10 p-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Delete group</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will hide the trip for everyone. You can’t undo this.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0 bg-background">
            <div className="text-sm text-muted-foreground">
              {formData.destination.trim()
                ? "Ready to save changes"
                : "Enter a destination to continue"}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSaving || isDeleting}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !formData.destination.trim() || isSaving || isDeleting
                }
                className="px-6 font-semibold"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
