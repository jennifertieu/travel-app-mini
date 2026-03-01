import { useState } from "react";
import { X, Zap, Grid3X3, Users } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import { useModals } from "../../contexts/ModalContext";
import { useMember } from "../../contexts/MemberContext";
import { useMyReactions } from "../../hooks/useMyReactions";
import { useAllTripReactions } from "../../hooks/useAllTripReactions";
import { useTripMembers } from "../../hooks/useTripMembers";
import { SwipeMode } from "../rating/SwipeMode";
import { MyRatingsGrid } from "../rating/MyRatingsGrid";
import { GroupConsensus } from "../rating/GroupConsensus";

type TabKey = "swipe" | "myRatings" | "consensus";

const TABS: { key: TabKey; label: string; icon: typeof Zap }[] = [
  { key: "swipe", label: "Swipe", icon: Zap },
  { key: "myRatings", label: "My Ratings", icon: Grid3X3 },
  { key: "consensus", label: "Group Consensus", icon: Users },
];

interface RatingHubProps {
  ideas: any[];
  tripId: string | null;
}

export function RatingHub({ ideas, tripId }: RatingHubProps) {
  const { closeModal } = useModals();
  const { member } = useMember();

  const [activeTab, setActiveTab] = useState<TabKey>("swipe");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSignal, setActiveSignal] = useState<string | null>(null);

  const enrichedIdeas = ideas.filter(
    (i: any) => i.enrichment_status === "DONE",
  );
  const ideaIds = enrichedIdeas.map((i: any) => i.id);

  const { data: myReactions, isLoading: reactionsLoading } = useMyReactions(
    member?.id ?? null,
    ideaIds,
  );
  const { data: allReactions, isLoading: allReactionsLoading } =
    useAllTripReactions(tripId, ideaIds);
  const { data: members = [] } = useTripMembers(tripId);

  if (!member) return null;

  const handleClose = () => closeModal("ratingMode");

  const isLoading = reactionsLoading || allReactionsLoading;

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent
        hideClose
        className="max-w-6xl h-[90vh] overflow-hidden flex flex-col !p-0 gap-0"
      >
        {/* Tab header */}
        <div className="border-b border-border px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="animate-pulse text-muted-foreground">
              Loading ratings...
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === "swipe" && (
              <SwipeMode
                ideas={enrichedIdeas}
                myReactions={myReactions}
                memberId={member.id}
                ideaIds={ideaIds}
                onClose={handleClose}
              />
            )}
            {activeTab === "myRatings" && (
              <MyRatingsGrid
                ideas={enrichedIdeas}
                myReactions={myReactions}
                allReactions={allReactions}
                members={members}
                memberId={member.id}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                activeSignal={activeSignal}
                onSignalChange={setActiveSignal}
              />
            )}
            {activeTab === "consensus" && (
              <GroupConsensus
                ideas={enrichedIdeas}
                allReactions={allReactions}
                members={members}
                currentMemberId={member.id}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
