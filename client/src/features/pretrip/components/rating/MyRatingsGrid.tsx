import { useSetReaction } from "../../hooks/useReactions";
import type { MyReactionMap } from "../../hooks/useMyReactions";
import type { AllReactionsMap } from "../../hooks/useAllTripReactions";
import type { TripMember } from "@/hooks/useTripMembers";
import { CategoryFilterBar } from "../filters/CategoryFilterBar";
import { SignalFilterBar } from "../filters/SignalFilterBar";
import { RatingCard } from "./RatingCard";

const ACTIVITY_CATEGORIES = new Set([
  "sightseeing",
  "activity",
  "nature",
  "shopping",
  "nightlife",
]);

function matchesCategory(
  category: string | null,
  filter: string | null,
): boolean {
  if (!filter) return true;
  const cat = (category || "").toLowerCase();
  if (filter === "food") return cat === "food";
  if (filter === "stay") return cat === "stay";
  if (filter === "activities") return ACTIVITY_CATEGORIES.has(cat);
  return false;
}

interface MyRatingsGridProps {
  ideas: any[];
  myReactions: MyReactionMap;
  allReactions: AllReactionsMap;
  members: TripMember[];
  memberId: string;
  activeCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
  activeSignal: string | null;
  onSignalChange: (sig: string | null) => void;
}

export function MyRatingsGrid({
  ideas,
  myReactions,
  allReactions,
  members,
  memberId,
  activeCategory,
  onCategoryChange,
  activeSignal,
  onSignalChange,
}: MyRatingsGridProps) {
  const setReactionMutation = useSetReaction();

  // Only ideas the user has rated
  const ratedIdeas = ideas.filter((idea: any) => myReactions[idea.id]);

  // Signal counts for filter bar
  const signalCounts: Record<string, number> = {};
  for (const idea of ratedIdeas) {
    const sig = myReactions[idea.id]?.signal;
    if (sig) signalCounts[sig] = (signalCounts[sig] || 0) + 1;
  }

  // Apply filters (intersection)
  const filtered = ratedIdeas.filter((idea: any) => {
    if (!matchesCategory(idea.category, activeCategory)) return false;
    if (activeSignal && myReactions[idea.id]?.signal !== activeSignal)
      return false;
    return true;
  });

  const handleReRate = (ideaId: string, signal: string) => {
    setReactionMutation.mutate({
      idea_id: ideaId,
      member_id: memberId,
      signal,
      comment: null,
    });
  };

  if (ratedIdeas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <p className="text-muted-foreground">
          You haven't rated any ideas yet. Try Swipe mode first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
        <CategoryFilterBar
          ideas={ratedIdeas}
          activeCategory={activeCategory}
          onCategoryChange={onCategoryChange}
        />
        <div className="h-5 w-px bg-border shrink-0" />
        <SignalFilterBar
          activeSignal={activeSignal}
          onSignalChange={onSignalChange}
          counts={signalCounts}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground text-sm">
            No ideas match the current filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((idea: any) => (
            <RatingCard
              key={idea.id}
              idea={idea}
              mySignal={myReactions[idea.id]?.signal}
              reactions={allReactions[idea.id] || []}
              members={members}
              onReRate={(signal) => handleReRate(idea.id, signal)}
              showVoteSummary
            />
          ))}
        </div>
      )}
    </div>
  );
}
