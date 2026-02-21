"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { X, ImageIcon, Heart } from "lucide-react";
import { TikTokEmbed, YouTubeEmbed } from "react-social-media-embed";
import { useModals } from "../../contexts/ModalContext";
import { useMember } from "../../contexts/MemberContext";
import { useUpdateIdea } from "../../hooks/useIdeas";
import { useReactions } from "../../hooks/useReactions";
import { useTripMembers } from "../../hooks/useTripMembers";
import { ReactionBar } from "../ui/ReactionBar";
import { ReviewsSection } from "../cards/ReviewsSection";
import { supabase } from "../../lib/supabase";

interface IdeaDetailModalProps {
  idea: any;
  tripId?: string | null;
}


/** Only true when we have a real embeddable video URL (not ai-suggestion-*, ai-area-search-*, etc.) */
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

// Skeleton Component
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`}></div>;
}

export function IdeaDetailModal({ idea: initialIdea, tripId }: IdeaDetailModalProps) {
  const { isOpen, closeModal } = useModals();
  const { member } = useMember();
  const updateIdeaMutation = useUpdateIdea(initialIdea?.id || "");
  const { data: reactions = [] } = useReactions(initialIdea?.id ?? null);
  const { data: members = [] } = useTripMembers(tripId ?? null);

  // Local form state
  const [formData, setFormData] = useState<any>(initialIdea || {});
  const [thumbnailErrors, setThumbnailErrors] = useState<
    Record<number, boolean>
  >({});
  const [mainImageError, setMainImageError] = useState(false);
  const [fallbackImageError, setFallbackImageError] = useState(false);

  // Sync form data when idea changes
  useEffect(() => {
    if (initialIdea) {
      setFormData(initialIdea);
      setThumbnailErrors({});
      setMainImageError(false);
      setFallbackImageError(false);
    }
  }, [initialIdea]);

  const hasEnrichment =
    initialIdea?.enrichment_status !== "CREATED" &&
    initialIdea?.enrichment_status !== "UNFURLED";

  const saveReaction = reactions.find(
    (r) => r.signal === "save" && r.member_id === member?.id,
  );
  const isSaved = !!saveReaction;

  const handleToggleSave = async () => {
    if (!member || !initialIdea) return;
    if (saveReaction) {
      await supabase
        .from("trip_reel_idea_reactions")
        .delete()
        .eq("id", saveReaction.id);
    } else {
      await supabase.from("trip_reel_idea_reactions").insert({
        idea_id: initialIdea.id,
        member_id: member.id,
        member_name: member.displayName ?? null,
        signal: "save",
      });
    }
  };

  const handleClose = async () => {
    if (hasEnrichment && initialIdea) {
      try {
        await updateIdeaMutation.mutateAsync(formData);
      } catch (error) {
        console.error("Failed to update idea:", error);
      }
    }
    closeModal("ideaDetail");
  };

  const handleAddTag = (tag: string) => {
    if (tag.trim() && !formData.tags?.includes(tag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tag.trim()],
      });
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t: string) => t !== tag) || [],
    });
  };

  if (!isOpen("ideaDetail") || !initialIdea) return null;

  return (
    <Dialog open={isOpen("ideaDetail")} onOpenChange={handleClose}>
      <DialogContent
        hideClose
        className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col !p-0 gap-0"
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0 gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">
              {formData.title || "Idea Details"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
              {hasEmbeddableVideo(initialIdea)
                ? initialIdea.source_platform === "tiktok"
                  ? "TikTok"
                  : "YouTube Shorts"
                : "Google Places"}
              {" • "}
              {initialIdea.enrichment_status}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {hasEnrichment && (
              <ReactionBar
                reactions={reactions}
                members={members}
                currentMemberId={member?.id ?? null}
              />
            )}
            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              onClick={handleToggleSave}
              className={`h-8 gap-1.5 px-3 ${
                isSaved
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  : ""
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 ${isSaved ? "fill-red-500 text-red-500" : ""}`}
              />
              {isSaved ? "Saved" : "Save"}
            </Button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[420px_1fr] gap-8 p-8">
            {/* Left Column - Video (Always show immediately) */}
            <div className="flex flex-col gap-5">
              {/* Video Container */}
              <div className="w-full aspect-[9/16] bg-muted rounded-2xl overflow-hidden relative shadow-lg">
                {hasEmbeddableVideo(initialIdea) ? (
                  initialIdea.source_platform === "tiktok" ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <TikTokEmbed url={initialIdea.source_url} width={420} />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <YouTubeEmbed
                        url={initialIdea.source_url}
                        width={420}
                        height={600}
                      />
                    </div>
                  )
                ) : (() => {
                  const fallbackPhoto =
                    formData.place?.photoUrl ||
                    formData.place?.photos?.[0];
                  return fallbackPhoto && !fallbackImageError ? (
                    <img
                      src={fallbackPhoto}
                      alt={formData.title || "Place photo"}
                      className="w-full h-full object-cover"
                      onError={() => setFallbackImageError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                      <ImageIcon className="h-10 w-10" />
                      <span>No media available</span>
                    </div>
                  );
                })()}
              </div>

              {/* Source URL */}
              {hasEmbeddableVideo(initialIdea) && (
                <div className="border border-border rounded-xl p-4 bg-card">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Source URL
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={initialIdea.source_url}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-muted/50 font-mono"
                  />
                </div>
              )}

              {/* Tags */}
              {hasEnrichment && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags?.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:opacity-70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Input
                      placeholder="Add tag"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddTag(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Details (Show skeletons if not enriched) */}
            <div className="overflow-y-auto pr-3 space-y-6">
              {!hasEnrichment ? (
                // Show skeletons while enriching
                <>
                  <Skeleton className="w-full h-32 rounded-xl" />
                  <Skeleton className="w-full h-64 rounded-xl" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                  </div>
                </>
              ) : (
                <>
                  {/* Summary Card */}
                  <div className="p-4 border border-border rounded-xl bg-accent/50">
                    <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest">
                      <span className="text-lg">📝</span>
                      <span>Description</span>
                    </div>
                    <Textarea
                      value={formData.summary || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, summary: e.target.value })
                      }
                      placeholder="Add description"
                      rows={4}
                      className="text-sm leading-relaxed font-medium bg-transparent border-none resize-none focus-visible:ring-0 p-0"
                    />
                  </div>

                  {/* Place Photo */}
                  {formData.place?.photoUrl && !mainImageError && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Photos
                      </div>
                      <div className="rounded-xl overflow-hidden border border-border">
                        <img
                          src={formData.place.photoUrl}
                          alt={
                            formData.location?.name ||
                            formData.title ||
                            "Place photo"
                          }
                          className="w-full h-64 object-cover"
                          onError={() => setMainImageError(true)}
                        />
                      </div>
                      {formData.place.photos &&
                        formData.place.photos.length > 1 && (
                          <div className="grid grid-cols-4 gap-2">
                            {formData.place.photos
                              .slice(1, 5)
                              .map((photoUrl: string, idx: number) => {
                                if (thumbnailErrors[idx]) return null;
                                return (
                                  <div
                                    key={idx}
                                    className="rounded-lg overflow-hidden border border-border"
                                  >
                                    <img
                                      src={photoUrl}
                                      alt={`Photo ${idx + 2}`}
                                      className="w-full h-20 object-cover"
                                      onError={() =>
                                        setThumbnailErrors((prev) => ({
                                          ...prev,
                                          [idx]: true,
                                        }))
                                      }
                                    />
                                  </div>
                                );
                              })}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Place Details Grid */}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      Place Details
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Location */}
                      <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">📍</span>
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Location
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {formData.place?.address ||
                              formData.location?.name ||
                              "Unknown location"}
                          </p>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">⭐</span>
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Rating
                          </div>
                        </div>
                        <div>
                          <div className="text-base font-bold text-foreground">
                            {formData.place?.rating
                              ? `${formData.place.rating} / 5.0`
                              : "No rating"}
                          </div>
                          <span className="inline-block mt-2 px-2.5 py-1 bg-muted rounded-lg text-xs font-semibold text-muted-foreground">
                            {formData.place?.reviewCount?.toLocaleString() || 0}{" "}
                            reviews
                          </span>
                        </div>
                      </div>

                      {/* Cost */}
                      <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">💰</span>
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Cost
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {formData.cost_bucket || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Best Time */}
                      <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">🕐</span>
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Best Time
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground capitalize">
                            {formData.time_of_day || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Google Reviews */}
                  {formData.place?.reviews && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                        Google Reviews
                      </div>
                      <ReviewsSection
                        reviews={formData.place.reviews}
                        isLoading={false}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
