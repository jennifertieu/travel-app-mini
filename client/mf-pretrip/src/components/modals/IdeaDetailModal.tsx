"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { X, ImageIcon } from "lucide-react";
import { TikTokEmbed, YouTubeEmbed } from "react-social-media-embed";
import { useModals } from "../../contexts/ModalContext";
import { useUpdateIdea } from "../../hooks/useIdeas";
import { ReviewsSection } from "../cards/ReviewsSection";

interface IdeaDetailModalProps {
  idea: any;
}

const COST_OPTIONS = ["$", "$$", "$$$"] as const;
const TIME_OF_DAY_OPTIONS = ["morning", "afternoon", "evening"] as const;

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

export function IdeaDetailModal({ idea: initialIdea }: IdeaDetailModalProps) {
  const { isOpen, closeModal } = useModals();
  const updateIdeaMutation = useUpdateIdea(initialIdea?.id || "");

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

  const handleClose = () => {
    closeModal("ideaDetail");
  };

  const handleSave = async () => {
    if (initialIdea) {
      try {
        await updateIdeaMutation.mutateAsync(formData);
        handleClose();
      } catch (error) {
        console.error("Failed to update idea:", error);
        alert("Failed to update idea. Please try again.");
      }
    }
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

  const hasEnrichment =
    initialIdea.enrichment_status !== "CREATED" &&
    initialIdea.enrichment_status !== "UNFURLED";

  return (
    <Dialog open={isOpen("ideaDetail")} onOpenChange={handleClose}>
      <DialogContent
        hideClose
        className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col !p-0 gap-0"
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex-1">
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
          <button
            onClick={handleClose}
            className="ml-4 p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
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
                      <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-all">
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
                      <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-all">
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
                      <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">💰</span>
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Cost
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {COST_OPTIONS.map((cost) => (
                            <Button
                              key={cost}
                              size="sm"
                              variant={
                                formData.cost_bucket === cost
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                setFormData({ ...formData, cost_bucket: cost })
                              }
                              className={`text-sm font-bold h-7 px-2.5 ${
                                formData.cost_bucket === cost
                                  ? ""
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {cost}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Best Time */}
                      <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-all">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">🕐</span>
                          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Best Time
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {TIME_OF_DAY_OPTIONS.map((time) => (
                            <Button
                              key={time}
                              size="sm"
                              variant={
                                formData.time_of_day === time
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  time_of_day: time,
                                })
                              }
                              className={`text-xs font-bold h-7 px-2.5 capitalize ${
                                formData.time_of_day === time
                                  ? ""
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {time}
                            </Button>
                          ))}
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

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {initialIdea.enrichment_status}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="px-6">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateIdeaMutation.isPending || !hasEnrichment}
              className="px-6 font-semibold"
            >
              {updateIdeaMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
