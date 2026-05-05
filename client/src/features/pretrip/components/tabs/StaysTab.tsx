"use client";

import { useMemo, useState } from "react";

import { IdeaCard } from "../cards/IdeaCard";
import { IdeaCardSkeleton } from "../cards/IdeaCardSkeleton";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Search, Sparkles, Vote } from "lucide-react";
import { useModal } from "@/contexts/ModalContext";
import { AnnotationList } from "../layout/AnnotationList";
import { useAllTripReactions } from "../../hooks/useAllTripReactions";
import { useTripMembers } from "../../hooks/useTripMembers";
import { useSaveIdea } from "../../hooks/useSaveIdea";
import { useStartItineraryBuild } from "../../hooks/useStartItineraryBuild";
import { CategoryFilterBar } from "../filters/CategoryFilterBar";
import { EmptyStateStays } from "../EmptyStateStays";
import type { Database } from "@/types";
import type { Annotation } from "../../hooks/useRealtimeTrip";
import type { TripSuggestionInput } from "../../hooks/useStreamingSuggestions";

type Idea = Database["public"]["Tables"]["trip_reel_ideas"]["Row"];

type Tab = "explore" | "saved" | "notes";

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
  startHotelStreaming?: (tripData: TripSuggestionInput) => Promise<void>;
  isHotelStreaming?: boolean;
  homeBaseId?: string | null;
  onSetHomeBase?: (ideaId: string) => void;
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
  startHotelStreaming,
  isHotelStreaming,
  homeBaseId,
  onSetHomeBase,
}: IdeaSidebarProps) {
  const { openModal } = useModal();
  const { startBuild, isStarting } = useStartItineraryBuild();
  const [activeTab, setActiveTab] = useState<Tab>("explore");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  // Filtered ideas based on search and active category
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

    // Category filter
    if (activeCategory) {
      result = result.filter(
        (idea) => idea.category?.toLowerCase() === activeCategory,
      );
    }

    return result;
  }, [ideas, searchQuery, activeCategory]);

  const savedIdeas = useMemo(
    () => filteredIdeas.filter((idea) => savedIdeaIds.has(idea.id)),
    [filteredIdeas, savedIdeaIds],
  );

  // Count stay ideas for empty state detection
  const stayCount = useMemo(
    () => ideas.filter((i) => i.category?.toLowerCase() === "stay").length,
    [ideas],
  );

  const handleFindHotels = () => {
    if (startHotelStreaming && trip) {
      startHotelStreaming({
        tripId: tripId || "",
        destination: trip.destination || "",
        durationDays: trip.duration_days || null,
        budgetLevel: trip.budget_level || null,
        interests: trip.interests || null,
        createdBy: memberId || "",
      });
    }
  };

  const handleAddClick = () => {
    if (activeTab === "notes") {
      onDrawModeToggle?.(true);
    } else {
      onOpenAddIdea ? onOpenAddIdea() : openModal("addIdea");
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
        tripDurationDays={trip?.duration_days}
        homeBaseId={homeBaseId}
        onSetHomeBase={onSetHomeBase}
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

        {/* Category Filter Bar */}
        {activeTab !== "notes" && (
          <div className="mt-3 pb-3">
            <CategoryFilterBar
              ideas={ideas}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
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
              activeCategory === "stay" && stayCount === 0 ? (
                <EmptyStateStays
                  onFindHotels={handleFindHotels}
                  isSearching={isHotelStreaming || false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-3">
                    {activeTab === "saved" ? "❤️" : "💡"}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {activeTab === "saved"
                      ? "No saved ideas yet"
                      : activeCategory
                        ? "No ideas in this category"
                        : searchQuery
                          ? "No ideas match your search"
                          : "No ideas yet"}
                  </p>
                  {activeTab === "explore" && activeCategory && (
                    <Button
                      onClick={() => setActiveCategory(null)}
                      size="sm"
                      variant="outline"
                    >
                      Show all ideas
                    </Button>
                  )}
                  {activeTab === "explore" &&
                    !searchQuery &&
                    !activeCategory && (
                      <Button
                        onClick={() => openModal("addIdea")}
                        size="sm"
                        variant="outline"
                      >
                        Add your first idea
                      </Button>
                    )}
                </div>
              )
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
        <div className="flex items-center gap-2">
          {onOpenRating && (
            <Button
              variant="outline"
              className="rounded-full h-11 px-4 text-sm font-medium text-muted-foreground border-border bg-muted hover:bg-muted/80 shrink-0"
              onClick={onOpenRating}
            >
              <Vote className="h-4 w-4 mr-2" />
              Rate
            </Button>
          )}
          <Button
            className="flex-1 bg-foreground hover:bg-foreground/90 text-background rounded-full h-11 text-sm font-medium"
            disabled={!tripId || isStarting}
            onClick={() => {
              if (tripId) startBuild(tripId);
            }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isStarting ? "Starting…" : "Build Itinerary"}
          </Button>
        </div>
      </div>
    </div>
  );
}
