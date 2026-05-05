import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { X, ChevronLeft, ImageIcon } from "lucide-react";
import { TikTokEmbed, YouTubeEmbed } from "react-social-media-embed";
import { useSetReaction } from "../../hooks/useReactions";
import { useQueryClient } from "@tanstack/react-query";
import { ReviewsSection } from "../cards/ReviewsSection";
import { IdeaCardSkeleton } from "../cards/IdeaCardSkeleton";
import { SIGNAL_CONFIG, getSignalLabel } from "../../lib/signals";
import type { MyReactionMap } from "../../hooks/useMyReactions";

function hasEmbeddableVideo(idea: {
  source_url?: string | null;
  source_platform?: string;
}): boolean {
  const url = idea.source_url;
  if (!url || typeof url !== "string") return false;
  if (idea.source_platform === "tiktok") return url.includes("tiktok.com");
  if (idea.source_platform === "youtube")
    return url.includes("youtube.com") || url.includes("youtu.be");
  return false;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

interface SwipeModeProps {
  ideas: any[];
  myReactions: MyReactionMap;
  memberId: string;
  ideaIds: string[];
  onClose: () => void;
}

export function SwipeMode({
  ideas,
  myReactions,
  memberId,
  ideaIds,
  onClose,
}: SwipeModeProps) {
  const setReactionMutation = useSetReaction();
  const queryClient = useQueryClient();

  const unratedIds = ideaIds.filter((id) => !myReactions[id]);
  const ratedIds = ideaIds.filter((id) => myReactions[id]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComment, setShowComment] = useState(false);
  const [commentValue, setCommentValue] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [summaryCounts, setSummaryCounts] = useState<Record<string, number>>({
    fire: 0,
    down: 0,
    meh: 0,
    skip: 0,
  });

  // Freeze navigation order when component mounts
  const [navOrder, setNavOrder] = useState<string[]>([]);
  const navInitRef = useRef(false);

  useEffect(() => {
    if (navInitRef.current) return;
    const order = [...unratedIds, ...ratedIds];
    if (order.length > 0) {
      navInitRef.current = true;
      setNavOrder(order);
      setCurrentIndex(0);
    }
  }, []);

  const orderedIds =
    navOrder.length > 0 ? navOrder : [...unratedIds, ...ratedIds];
  const currentIdeaId = orderedIds[currentIndex] ?? null;
  const currentIdea = ideas.find((i: any) => i.id === currentIdeaId);
  const ratedCount = Object.keys(myReactions).length;
  const totalCount = ideas.length;
  const allRated = ratedCount >= totalCount && totalCount > 0;
  const isCompletionScreen = allRated && currentIndex >= orderedIds.length;

  useEffect(() => {
    const counts = { fire: 0, down: 0, meh: 0, skip: 0 };
    for (const r of Object.values(myReactions)) {
      if (r.signal in counts) counts[r.signal as keyof typeof counts]++;
    }
    setSummaryCounts(counts);
  }, [myReactions]);

  const handleReaction = useCallback(
    async (signal: "fire" | "down" | "meh" | "skip") => {
      if (!currentIdea || !memberId) return;
      try {
        await setReactionMutation.mutateAsync({
          idea_id: currentIdea.id,
          member_id: memberId,
          signal,
          comment: commentValue.trim() || null,
        });
        queryClient.invalidateQueries({
          queryKey: ["myReactions", memberId, [...ideaIds].sort().join(",")],
        });
        setCommentValue("");
        setShowComment(false);

        const isLast =
          currentIndex >= orderedIds.length - 1 || unratedIds.length === 1;
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentIndex(isLast ? orderedIds.length : currentIndex + 1);
          setIsTransitioning(false);
        }, 200);
      } catch (err) {
        console.error("Failed to save reaction:", err);
      }
    },
    [
      currentIdea,
      memberId,
      commentValue,
      currentIndex,
      orderedIds.length,
      unratedIds.length,
      setReactionMutation,
      queryClient,
      ideaIds,
    ],
  );

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((i) => i - 1);
        setShowComment(false);
        setCommentValue("");
        setIsTransitioning(false);
      }, 200);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentIdea || setReactionMutation.isPending) return;
      if (e.key === "1") handleReaction("fire");
      else if (e.key === "2") handleReaction("down");
      else if (e.key === "3") handleReaction("meh");
      else if (e.key === "4") handleReaction("skip");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIdea?.id, setReactionMutation.isPending, handleReaction]);

  const hasEnrichment =
    currentIdea &&
    currentIdea.enrichment_status !== "CREATED" &&
    currentIdea.enrichment_status !== "UNFURLED";

  // Completion screen
  if (isCompletionScreen) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-semibold mb-2">All caught up!</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-md">
          You&apos;ve rated all {totalCount} ideas. Your votes help the group
          decide what to include in the itinerary.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          {SIGNAL_CONFIG.map(({ signal, label, icon: Icon }) => (
            <div
              key={signal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted"
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{summaryCounts[signal]}</span>
              <span className="text-muted-foreground text-sm">{label}</span>
            </div>
          ))}
        </div>
        <Button onClick={onClose} size="lg">
          Done
        </Button>
      </div>
    );
  }

  // Empty state
  if (ideas.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <p className="text-muted-foreground text-center">
          No ideas are ready to rate yet.
        </p>
        <Button onClick={onClose} className="mt-4">
          Close
        </Button>
      </div>
    );
  }

  // Loading
  if (!currentIdea) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <IdeaCardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Progress header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {ratedCount} of {totalCount} ideas rated
          </span>
          <div className="mt-1.5 h-1.5 w-48 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-300"
              style={{
                width: `${totalCount > 0 ? (ratedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        {currentIndex > 0 && (
          <Button variant="ghost" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        )}
      </div>

      {/* Idea content */}
      <div
        className={`flex-1 overflow-y-auto transition-opacity duration-200 ${isTransitioning ? "opacity-50" : "opacity-100"}`}
      >
        <div className="grid grid-cols-[420px_1fr] gap-8 p-8">
          {/* Left - Media */}
          <div className="flex flex-col gap-5">
            <div className="w-full aspect-[9/16] bg-muted rounded-2xl overflow-hidden relative shadow-lg">
              {hasEmbeddableVideo(currentIdea) ? (
                currentIdea.source_platform === "tiktok" ? (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <TikTokEmbed url={currentIdea.source_url!} width={420} />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <YouTubeEmbed
                      url={currentIdea.source_url!}
                      width={420}
                      height={600}
                    />
                  </div>
                )
              ) : (
                (() => {
                  const fallbackPhoto =
                    currentIdea.place?.photoUrl ||
                    currentIdea.place?.photos?.[0];
                  return fallbackPhoto ? (
                    <img
                      src={fallbackPhoto}
                      alt={currentIdea.title || "Place photo"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                      <ImageIcon className="h-10 w-10" />
                      <span>No media available</span>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Right - Details */}
          <div className="overflow-y-auto pr-3 space-y-6">
            {!hasEnrichment ? (
              <>
                <Skeleton className="w-full h-32 rounded-xl" />
                <Skeleton className="w-full h-64 rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-32 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {currentIdea.title || "Idea Details"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasEmbeddableVideo(currentIdea)
                      ? currentIdea.source_platform === "tiktok"
                        ? "TikTok"
                        : "YouTube Shorts"
                      : "Google Places"}
                  </p>
                </div>
                {currentIdea.summary && (
                  <div className="p-4 border border-border rounded-xl bg-accent/50">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Description
                    </div>
                    <p className="text-sm leading-relaxed">
                      {currentIdea.summary}
                    </p>
                  </div>
                )}
                {currentIdea.place?.photoUrl && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img
                      src={currentIdea.place.photoUrl}
                      alt={currentIdea.title || "Place"}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border border-border rounded-xl bg-card">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Location
                    </div>
                    <p className="text-sm font-semibold">
                      {currentIdea.place?.address ||
                        (currentIdea.location as any)?.name ||
                        "Unknown"}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-xl bg-card">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Rating
                    </div>
                    <p className="text-sm font-semibold">
                      {currentIdea.place?.rating
                        ? `${currentIdea.place.rating} / 5.0`
                        : "No rating"}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-xl bg-card">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Cost
                    </div>
                    <p className="text-sm font-semibold">
                      {currentIdea.cost_bucket || "—"}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-xl bg-card">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Best Time
                    </div>
                    <p className="text-sm font-semibold capitalize">
                      {currentIdea.time_of_day || "—"}
                    </p>
                  </div>
                </div>
                {currentIdea.place?.reviews && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      Google Reviews
                    </div>
                    <ReviewsSection
                      reviews={currentIdea.place.reviews}
                      isLoading={false}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reaction bar footer */}
      {hasEnrichment && (
        <div className="border-t border-border px-6 py-5 flex-shrink-0">
          <div className="flex flex-wrap gap-3 justify-center mb-3">
            {SIGNAL_CONFIG.map(({ signal, icon: Icon, color }) => (
              <Button
                key={signal}
                variant={
                  myReactions[currentIdea.id]?.signal === signal
                    ? "default"
                    : "outline"
                }
                size="lg"
                onClick={() => handleReaction(signal as any)}
                disabled={setReactionMutation.isPending}
                className="min-w-[120px]"
              >
                <Icon className={`h-5 w-5 mr-2 ${color}`} />
                {getSignalLabel(signal, currentIdea.category)}
              </Button>
            ))}
          </div>
          <div className="flex justify-center">
            {showComment ? (
              <div className="w-full max-w-md space-y-2">
                <Textarea
                  placeholder="Add a comment (optional)"
                  value={commentValue}
                  onChange={(e) => setCommentValue(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <button
                  onClick={() => setShowComment(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Hide comment
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowComment(true)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Add a comment
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
