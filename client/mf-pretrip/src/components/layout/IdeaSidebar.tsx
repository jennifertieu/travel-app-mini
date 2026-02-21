"use client";

import { useMemo, useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

import { IdeaCard } from "../cards/IdeaCard";
import { IdeaCardSkeleton } from "../cards/IdeaCardSkeleton";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  Clock,
  Vote,
} from "lucide-react";
import { useModals } from "../../contexts/ModalContext";
import { AnnotationList } from "./AnnotationList";
import { useAllTripReactions } from "../../hooks/useAllTripReactions";
import { useTripMembers } from "../../hooks/useTripMembers";
import { useSaveIdea } from "../../hooks/useSaveIdea";
import type { Database } from "@travel-app/shared-types";
import type { Annotation } from "../../hooks/useRealtimeTrip";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];

type Tab = "explore" | "saved" | "notes";

/** Map trip interest (UI) → idea categories (AI). Ideas use: food, sightseeing, nature, shopping, nightlife, activity, stay, other. */
const INTEREST_TO_IDEA_CATEGORIES: Record<string, string[]> = {
  culture: ["sightseeing"],
  history: ["sightseeing"],
  art: ["sightseeing"],
  adventure: ["activity"],
  relaxation: ["nature", "stay"],
  photography: ["nature", "sightseeing", "other"],
  food: ["food"],
  nature: ["nature"],
  nightlife: ["nightlife"],
  shopping: ["shopping"],
};

interface TripInfo {
  title?: string | null;
  destination?: string | null;
  interests?: string[] | null;
  budget_level?: string | null;
  duration_days?: number | null;
}

export interface IdeaSidebarProps {
  ideas: Idea[];
  annotations: Annotation[];
  isLoading?: boolean;
  isGenerating?: boolean;
  totalExpected?: number;
  tripId?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  trip?: TripInfo | null;
  unratedCount?: number;
  onOpenRating?: () => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onDrawModeToggle?: (enabled: boolean) => void;
  onOpenAddIdea?: () => void;
}

export function IdeaSidebar({
  ideas,
  annotations,
  isLoading,
  isGenerating,
  totalExpected = 10,
  tripId,
  memberId,
  memberName,
  trip,
  unratedCount,
  onOpenRating,
  onAnnotationClick,
  onAnnotationDelete,
  onDrawModeToggle,
  onOpenAddIdea,
}: IdeaSidebarProps) {
  const { openModal } = useModals();
  const [activeTab, setActiveTab] = useState<Tab>("explore");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter state
  const [activeFilters, setActiveFilters] = useState<{
    interests: boolean;
    budget: boolean;
    duration: boolean;
  }>({ interests: false, budget: false, duration: false });

  const [interestsDropdownOpen, setInterestsDropdownOpen] = useState(false);
  const interestsTriggerRef = useRef<HTMLButtonElement>(null);
  const interestsPanelRef = useRef<HTMLDivElement>(null);
  const [interestsPanelPosition, setInterestsPanelPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!interestsDropdownOpen || !interestsTriggerRef.current) return;
    const rect = interestsTriggerRef.current.getBoundingClientRect();
    setInterestsPanelPosition({ top: rect.bottom + 6, left: rect.left });
  }, [interestsDropdownOpen]);

  useEffect(() => {
    if (!interestsDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        interestsTriggerRef.current?.contains(target) ||
        interestsPanelRef.current?.contains(target)
      ) {
        return;
      }
      setInterestsDropdownOpen(false);
    };
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [interestsDropdownOpen]);

  const ideaIds = useMemo(() => ideas.map((i) => i.id), [ideas]);
  const { data: allReactions } = useAllTripReactions(tripId ?? null, ideaIds);
  const { data: members = [] } = useTripMembers(tripId ?? null);

  const { savedIdeaIds, toggleSave } = useSaveIdea(
    allReactions,
    memberId ?? null,
    memberName ?? null,
    tripId ?? null,
    ideaIds,
  );

  const showSkeletons = isLoading || (isGenerating && ideas.length === 0);
  const showStreaming = isGenerating && ideas.length > 0;
  const skeletonCount = showStreaming
    ? Math.max(totalExpected - ideas.length, 0)
    : 0;

  // Filtered ideas based on search and active filters
  const filteredIdeas = useMemo(() => {
    let result = ideas;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (idea) =>
          idea.title?.toLowerCase().includes(q) ||
          idea.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Category / interests filter (trip interests map to idea categories)
    if (activeFilters.interests && trip?.interests?.length) {
      const allowedCategories = new Set<string>();
      for (const interest of trip.interests) {
        const key = interest.toLowerCase().trim();
        const categories = INTEREST_TO_IDEA_CATEGORIES[key];
        if (categories) {
          categories.forEach((c) => allowedCategories.add(c));
        } else {
          allowedCategories.add("other");
        }
      }
      result = result.filter((idea) => {
        const cat = idea.category?.trim().toLowerCase();
        if (!cat) return true; // no category: keep so list doesn't empty
        return allowedCategories.has(cat);
      });
    }

    // Budget filter
    if (activeFilters.budget && trip?.budget_level) {
      result = result.filter(
        (idea) =>
          idea.cost_bucket?.toLowerCase() ===
          trip.budget_level?.toLowerCase(),
      );
    }

    // Duration filter: show only ideas with duration info; for short trips (≤2 days) prefer shorter activities
    if (activeFilters.duration) {
      result = result.filter((idea) => {
        if (!idea.duration_bucket) return false;
        if (trip?.duration_days != null && trip.duration_days <= 2) {
          const d = idea.duration_bucket.toLowerCase();
          return d === "30m" || d === "1-2h";
        }
        return true;
      });
    }

    return result;
  }, [ideas, searchQuery, activeFilters, trip]);

  const savedIdeas = useMemo(
    () => filteredIdeas.filter((idea) => savedIdeaIds.has(idea.id)),
    [filteredIdeas, savedIdeaIds],
  );

  const handleAddClick = () => {
    if (activeTab === "notes") {
      onDrawModeToggle?.(true);
    } else {
      onOpenAddIdea ? onOpenAddIdea() : openModal("addIdea");
    }
  };

  const toggleFilter = (key: "interests" | "budget" | "duration") => {
    setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnyFilterOn =
    activeFilters.interests || activeFilters.budget || activeFilters.duration;
  const toggleAllFilters = () => {
    if (hasAnyFilterOn) {
      setActiveFilters({
        interests: false,
        budget: false,
        duration: false,
      });
    } else {
      setActiveFilters({
        interests: !!(trip?.interests && trip.interests.length > 0),
        budget: !!trip?.budget_level,
        duration: true,
      });
    }
  };

  const displayIdeas = activeTab === "saved" ? savedIdeas : filteredIdeas;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "explore", label: "Explore", count: filteredIdeas.length },
    { key: "saved", label: "Saved", count: savedIdeas.length },
    { key: "notes", label: "Notes", count: annotations.length },
  ];

  const renderIdeaCard = (idea: Idea, animate = false) => {
    const card = (
      <IdeaCard
        idea={idea}
        reactions={allReactions[idea.id] ?? []}
        members={members}
        isSaved={savedIdeaIds.has(idea.id)}
        onToggleSave={toggleSave}
      />
    );
    if (animate) {
      return (
        <div
          key={idea.id}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {card}
        </div>
      );
    }
    return <div key={idea.id}>{card}</div>;
  };

  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Trip Title */}
      {trip?.title && (
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-tight min-w-0">
              {trip.title}
            </h1>
            {!!unratedCount && unratedCount > 0 && onOpenRating && (
              <button
                onClick={onOpenRating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors shrink-0"
              >
                <Vote className="h-3 w-3" />
                Rate {unratedCount} left
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === "saved"
              ? "Your saved ideas!"
              : activeTab === "notes"
                ? "Your trip notes."
                : "Let\u2019s start by brainstorming some ideas."}
          </p>
        </div>
      )}

      {/* Tabbed Header */}
      <div className="flex-shrink-0 border-b bg-background px-4 pt-3 pb-0">
        <div className="flex w-full p-1 bg-muted rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                activeTab === tab.key
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm">{tab.label}</span>
                <Badge variant="secondary" className="text-xs h-5">
                  {tab.count}
                </Badge>
              </div>
            </button>
          ))}
        </div>

        {/* Search Bar + Add */}
        {activeTab !== "notes" && (
          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for ideas"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button
              onClick={handleAddClick}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-4 shrink-0"
            >
              Add
            </Button>
          </div>
        )}

        {/* Filter Chips */}
        {activeTab !== "notes" && (
          <div className="flex items-center gap-2 mt-3 pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={toggleAllFilters}
              className={`p-1.5 rounded-md border transition-colors shrink-0 ${
                hasAnyFilterOn
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                  : "border-input hover:bg-muted text-muted-foreground"
              }`}
              title={hasAnyFilterOn ? "Clear all filters" : "Turn on all filters"}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            {trip?.interests && trip.interests.length > 0 && (
              <div className="relative shrink-0">
                <button
                  ref={interestsTriggerRef}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInterestsDropdownOpen((open) => !open);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    activeFilters.interests
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-muted text-foreground border-transparent hover:border-border"
                  }`}
                  aria-expanded={interestsDropdownOpen}
                  aria-haspopup="listbox"
                >
                  Interests
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      interestsDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {portalMounted &&
                  interestsDropdownOpen &&
                  interestsPanelPosition &&
                  createPortal(
                    <div
                      ref={interestsPanelRef}
                      className="fixed min-w-[180px] rounded-lg border border-border bg-background shadow-lg py-2 z-[9999]"
                      style={{
                        top: interestsPanelPosition.top,
                        left: interestsPanelPosition.left,
                      }}
                      role="listbox"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Trip interests
                      </p>
                      <ul className="max-h-48 overflow-y-auto">
                        {trip.interests.map((interest) => (
                          <li
                            key={interest}
                            className="px-3 py-1.5 text-sm capitalize"
                          >
                            {interest}
                          </li>
                        ))}
                      </ul>
                      <div className="border-t border-border mt-2 pt-2 px-3">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={activeFilters.interests}
                            onChange={(e) => {
                              setActiveFilters((prev) => ({
                                ...prev,
                                interests: e.target.checked,
                              }));
                            }}
                            className="rounded border-input"
                          />
                          Filter by these interests
                        </label>
                      </div>
                    </div>,
                    document.body,
                  )}
              </div>
            )}

            {trip?.budget_level && (
              <button
                onClick={() => toggleFilter("budget")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${
                  activeFilters.budget
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-muted text-foreground border-transparent hover:border-border"
                }`}
              >
                Budget {trip.budget_level}
              </button>
            )}

            <button
              onClick={() => toggleFilter("duration")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${
                activeFilters.duration
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-muted text-foreground border-transparent hover:border-border"
              }`}
            >
              <Clock className="h-3 w-3" />
              Duration
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "notes" ? (
          <div className="py-4">
            <AnnotationList
              annotations={annotations}
              onAnnotationClick={onAnnotationClick || (() => {})}
              onAnnotationDelete={onAnnotationDelete || (() => {})}
            />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {showSkeletons ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <IdeaCardSkeleton key={i} />
                ))}
              </>
            ) : showStreaming ? (
              <>
                {displayIdeas.map((idea) => renderIdeaCard(idea, true))}
                {skeletonCount > 0 &&
                  [...Array(skeletonCount)].map((_, index) => (
                    <IdeaCardSkeleton key={`streaming-skeleton-${index}`} />
                  ))}
              </>
            ) : displayIdeas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-3">
                  {activeTab === "saved" ? "❤️" : "💡"}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {activeTab === "saved"
                    ? "No saved ideas yet"
                    : hasAnyFilterOn
                      ? "No ideas match your filters"
                      : searchQuery
                        ? "No ideas match your search"
                        : "No ideas yet"}
                </p>
                {activeTab === "explore" && hasAnyFilterOn && (
                  <Button
                    onClick={toggleAllFilters}
                    size="sm"
                    variant="outline"
                  >
                    Clear filters
                  </Button>
                )}
                {activeTab === "explore" && !searchQuery && !hasAnyFilterOn && (
                  <Button
                    onClick={() => openModal("addIdea")}
                    size="sm"
                    variant="outline"
                  >
                    Add your first idea
                  </Button>
                )}
              </div>
            ) : (
              displayIdeas.map((idea) => renderIdeaCard(idea))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t bg-background px-4 py-3 space-y-2">
        {isGenerating && activeTab === "explore" && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Generating...</span>
          </div>
        )}
        <Button
          className="w-full bg-foreground hover:bg-foreground/90 text-background rounded-full h-11 text-sm font-medium"
          onClick={() => {
            /* TODO: wire up itinerary builder */
          }}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Build Itinerary
        </Button>
      </div>
    </div>
  );
}
