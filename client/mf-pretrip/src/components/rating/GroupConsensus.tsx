import type { AllReactionsMap } from "../../hooks/useAllTripReactions";
import type { TripMember } from "../../hooks/useTripMembers";
import { CategoryFilterBar } from "../filters/CategoryFilterBar";
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

interface ConsensusItem {
  ideaId: string;
  idea: any;
  totalVotes: number;
  fireCount: number;
  downCount: number;
  mehCount: number;
  skipCount: number;
  positiveScore: number;
}

interface GroupConsensusProps {
  ideas: any[];
  allReactions: AllReactionsMap;
  members: TripMember[];
  currentMemberId: string;
  activeCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
}

export function GroupConsensus({
  ideas,
  allReactions,
  members,
  currentMemberId,
  activeCategory,
  onCategoryChange,
}: GroupConsensusProps) {
  // Build consensus items
  const items: ConsensusItem[] = ideas
    .filter((idea: any) => matchesCategory(idea.category, activeCategory))
    .map((idea: any) => {
      const reactions = allReactions[idea.id] || [];
      let fireCount = 0,
        downCount = 0,
        mehCount = 0,
        skipCount = 0;
      for (const r of reactions) {
        if (r.signal === "fire") fireCount++;
        else if (r.signal === "down") downCount++;
        else if (r.signal === "meh") mehCount++;
        else if (r.signal === "skip") skipCount++;
      }
      const totalVotes = fireCount + downCount + mehCount + skipCount;
      const positiveScore = fireCount * 2 + downCount;
      return {
        ideaId: idea.id,
        idea,
        totalVotes,
        fireCount,
        downCount,
        mehCount,
        skipCount,
        positiveScore,
      };
    })
    .filter((item) => item.totalVotes > 0)
    .sort((a, b) => {
      if (b.positiveScore !== a.positiveScore)
        return b.positiveScore - a.positiveScore;
      if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
      return b.fireCount - a.fireCount;
    });

  // Find current user's signal per idea
  const mySignals: Record<string, string> = {};
  for (const [ideaId, reactions] of Object.entries(allReactions)) {
    const mine = reactions.find((r) => r.member_id === currentMemberId);
    if (mine) mySignals[ideaId] = mine.signal;
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
      <CategoryFilterBar
        ideas={ideas}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
      />

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <p className="text-muted-foreground">
            No one has rated ideas yet. Be the first!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item, idx) => (
            <div key={item.ideaId} className="relative">
              {idx < 3 && (
                <div className="absolute -top-2 -left-2 z-10 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow">
                  {idx + 1}
                </div>
              )}
              <RatingCard
                idea={item.idea}
                mySignal={mySignals[item.ideaId]}
                reactions={allReactions[item.ideaId] || []}
                members={members}
                showVoteSummary
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
