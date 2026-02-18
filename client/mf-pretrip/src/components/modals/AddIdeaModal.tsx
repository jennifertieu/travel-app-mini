"use client";

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useModals } from "../../contexts/ModalContext";
import { useMember } from "../../contexts/MemberContext";
import { useCurrentTrip } from "../../hooks/useCurrentTrip";
import { useAddIdea, useUpdateIdea } from "../../hooks/useIdeas";
import { useEnrichment, PlaceReview } from "../../hooks/useEnrichment";
import { X, Check, AlertCircle } from "lucide-react";
import { TikTokEmbed, YouTubeEmbed } from "react-social-media-embed";
import { ReviewsSection } from "../cards/ReviewsSection";
import { v4 as uuidv4 } from "uuid";
import { Json } from "@travel-app/shared-types";

// URL validation helpers
function normalizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return `https://${trimmed}`;
}

function detectPlatform(url: string): "tiktok" | "youtube" | null {
  try {
    const normalizedUrl = normalizeUrl(url);
    const urlObj = new URL(normalizedUrl);
    const hostname = urlObj.hostname?.toLowerCase() ?? "";
    const pathname = urlObj.pathname ?? "";
    if (hostname.includes("tiktok.com") || hostname.includes("vm.tiktok.com")) {
      return "tiktok";
    }
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      if (
        normalizedUrl.includes("/shorts/") ||
        pathname.includes("/shorts/") ||
        hostname.includes("youtu.be")
      ) {
        return "youtube";
      }
    }
    return null;
  } catch {
    return null;
  }
}

function isValidSocialMediaUrl(url: string): boolean {
  return detectPlatform(url) !== null;
}

export function AddIdeaModal() {
  const { isOpen, closeModal } = useModals();
  const { member } = useMember();
  const addIdeaMutation = useAddIdea();
  const updateIdeaMutation = useUpdateIdea();
  const {
    enrich,
    data: enrichmentData,
    isLoading,
    isError,
    error,
    retryCount,
    reset,
  } = useEnrichment();

  const { currentTrip, currentTripId } = useCurrentTrip();

  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
  const [step, setStep] = useState<"input" | "processing" | "enriched">(
    "input",
  );
  const [showEmbed, setShowEmbed] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [currentIdeaId, setCurrentIdeaId] = useState<string | null>(null);
  const [mainImageError, setMainImageError] = useState(false);
  const [thumbnailErrors, setThumbnailErrors] = useState<
    Record<number, boolean>
  >({});

  const [enrichmentState, setEnrichmentState] = useState({
    status: "CREATED" as
      | "CREATED"
      | "UNFURLED"
      | "SUMMARIZED"
      | "ENRICHED"
      | "DONE",
    summary: null as string | null,
    tags: [] as string[],
    place: null as string | null,
    address: null as string | null,
    rating: null as number | null,
    reviewCount: null as number | null,
    price: null as string | null,
    location: null as string | null,
    reviews: null as PlaceReview[] | null,
    photoUrl: null as string | null,
    photos: null as string[] | null,
  });

  const platform = detectPlatform(url);
  const isValidUrl = isValidSocialMediaUrl(url);

  useEffect(() => {
    if (showEmbed) {
      setVideoLoading(true);
      const timer = setTimeout(() => setVideoLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [showEmbed]);

  const handleUrlChange = (value: string) => {
    const normalizedUrl = normalizeUrl(value);
    setUrl(normalizedUrl);

    if (normalizedUrl && isValidSocialMediaUrl(normalizedUrl)) {
      setTimeout(() => {
        setShowEmbed(true);
        setStep("processing");
        setEnrichmentState((prev) => ({ ...prev, status: "CREATED" }));
        startEnrichmentPipeline(normalizedUrl);
      }, 100);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    handleUrlChange(pastedText);
  };

  const extractVideoId = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname ?? "";
      const p = detectPlatform(url);
      if (p === "tiktok") {
        const match = pathname.match(/\/video\/(\d+)/);
        if (match) return match[1];
        const shortMatch = pathname.match(/^\/([A-Za-z0-9]+)\/?$/);
        if (shortMatch) return shortMatch[1];
      } else if (p === "youtube") {
        const match = pathname.match(/\/shorts\/([A-Za-z0-9_-]+)/);
        if (match) return match[1];
        const shortMatch = pathname.match(/^\/([A-Za-z0-9_-]+)/);
        if (shortMatch && urlObj.hostname.includes("youtu.be"))
          return shortMatch[1];
      }
    } catch {}
    return uuidv4().slice(0, 8);
  };

  const startEnrichmentPipeline = async (videoUrl: string) => {
    if (!currentTripId || !member) {
      console.error("No trip or member selected");
      return;
    }

    console.log(
      "🚀 [AddIdeaModal] Starting enrichment pipeline for:",
      videoUrl,
    );

    // Detect platform from the actual URL being processed (not stale state)
    const detectedPlatform = detectPlatform(videoUrl);

    // Create the idea immediately
    const newIdeaId = uuidv4();
    const videoId = extractVideoId(videoUrl);
    const initialIdea = {
      id: newIdeaId,
      trip_id: currentTripId,
      created_by: member.id,
      source_url: videoUrl,
      source_platform: detectedPlatform || "youtube",
      source_video_id: videoId,
      comment: comment.trim() || null,
      enrichment_status: "CREATED",
      title: `${detectedPlatform === "tiktok" ? "TikTok" : "YouTube"} video`,
      summary: null,
    };

    try {
      await addIdeaMutation.mutateAsync(initialIdea);
      setCurrentIdeaId(newIdeaId);

      // Update status to UNFURLED
      setEnrichmentState((prev) => ({ ...prev, status: "UNFURLED" }));

      // Call the enrichment API
      console.log("📡 [AddIdeaModal] Calling enrichment API...");
      const result = await enrich({
        url: videoUrl,
        comment: comment.trim() || undefined,
        trip: {
          destination: currentTrip.destination,
          dates: {
            start: currentTrip.start_date
              ? new Date(currentTrip.start_date)
              : new Date(),
            end: currentTrip.end_date
              ? new Date(currentTrip.end_date)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        profile: {
          dietary: member.dietary || [],
          travelStyle: member.travelStyle || "balanced",
          interests: member.interests || [],
        },
      });

      console.log("✅ [AddIdeaModal] Enrichment complete:", result);

      // Update with unfurl data
      const titleToUse = result.place?.name || result.unfurl.title;
      await updateIdeaMutation.mutateAsync({
        id: newIdeaId,
        title: titleToUse,
        enrichment_status: "UNFURLED",
      });

      // Update status to SUMMARIZED
      setEnrichmentState((prev) => ({
        ...prev,
        status: "SUMMARIZED",
        summary: result.ai.summary,
        tags: result.ai.tags,
      }));

      await updateIdeaMutation.mutateAsync({
        id: newIdeaId,
        summary: result.ai.summary,
        tags: result.ai.tags,
        category: result.ai.category,
        cost_bucket: result.ai.costGuess,
        duration_bucket: result.ai.durationGuess,
        icon_type: result.ai.iconType,
        enrichment_status: "SUMMARIZED",
      });

      // If we have place data, update to ENRICHED
      if (result.place) {
        const placeData = result.place;
        setTimeout(() => {
          setEnrichmentState((prev) => ({
            ...prev,
            status: "ENRICHED",
            place: placeData.name || null,
            address: placeData.address || null,
            rating: placeData.rating || null,
            reviewCount: placeData.reviewCount || null,
            price: placeData.priceLevel
              ? "$".repeat(placeData.priceLevel)
              : null,
            location: currentTrip.destination,
            reviews: placeData.reviews || null,
            photoUrl: placeData.photoUrl || null,
            photos: placeData.photos || null,
          }));

          updateIdeaMutation.mutateAsync({
            id: newIdeaId,
            title: placeData.name,
            latitude: placeData.lat,
            longitude: placeData.lng,
            location: {
              name: placeData.name,
              address: placeData.address,
              confidence: placeData.confidence || "low",
              needsReview: placeData.confidence === "low",
            } as unknown as Json,
            place: {
              provider: placeData.provider || "google",
              placeId: placeData.placeId || "",
              rating: placeData.rating,
              reviewCount: placeData.reviewCount,
              priceLevel: placeData.priceLevel,
              reviews: placeData.reviews,
              photoUrl: placeData.photoUrl,
              photos: placeData.photos,
            } as unknown as Json,
            enrichment_status: "ENRICHED",
          });
        }, 500);
      }

      // Mark as DONE
      setTimeout(
        () => {
          setEnrichmentState((prev) => ({ ...prev, status: "DONE" }));
          updateIdeaMutation.mutateAsync({
            id: newIdeaId,
            enrichment_status: "DONE",
          });
          setStep("enriched");
        },
        result.place ? 1000 : 500,
      );
    } catch (error) {
      console.error("❌ [AddIdeaModal] Enrichment failed:", error);

      // Determine user-friendly error message
      let userMessage =
        "Unable to enrich automatically. You can add details manually in the idea drawer.";

      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          userMessage =
            "Network error. Please check your connection and try again.";
        } else if (error.message.includes("429")) {
          userMessage =
            "Too many requests. Please wait a moment and try again.";
        } else if (error.message.includes("Invalid URL")) {
          userMessage =
            "This URL format is not supported. Only TikTok and YouTube Shorts are supported.";
        } else if (error.message.includes("AI enrichment")) {
          userMessage =
            "AI service is temporarily unavailable. The idea was saved with basic information.";
        }
      }

      // Still mark as done but with partial data
      setEnrichmentState((prev) => ({
        ...prev,
        status: "DONE",
        summary: userMessage,
      }));

      if (currentIdeaId) {
        updateIdeaMutation.mutateAsync({
          id: currentIdeaId,
          enrichment_status: "DONE",
          summary: userMessage,
          title: "Social media idea (enrichment incomplete)",
        });
      }

      setStep("enriched");
    }
  };

  const handleSubmit = () => {
    if (!isValidUrl || enrichmentState.status !== "DONE") return;

    // Idea already added during enrichment, just close
    handleClose();
  };

  const handleClose = () => {
    closeModal("addIdea");
    setUrl("");
    setComment("");
    setStep("input");
    setShowEmbed(false);
    setVideoLoading(true);
    setCurrentIdeaId(null);
    setMainImageError(false);
    setThumbnailErrors({});
    setEnrichmentState({
      status: "CREATED",
      summary: null,
      tags: [],
      place: null,
      address: null,
      rating: null,
      reviewCount: null,
      price: null,
      location: null,
      reviews: null,
      photoUrl: null,
      photos: null,
    });
    reset();
  };

  if (!isOpen("addIdea")) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-background border border-border rounded-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transform transition-all duration-300 scale-100 opacity-100 ${
          step === "input" ? "max-w-lg" : "max-w-6xl"
        }`}
      >
        <div className="border-b border-border px-6 py-5 flex items-center justify-between flex-shrink-0 bg-background">
          <div className="flex-1">
            <h2 className="text-xl font-semibold tracking-tight">
              Add Travel Idea
            </h2>
            {step === "input" && (
              <p className="text-xs text-muted-foreground/70 mt-1.5 font-medium">
                Paste a video URL to get started
              </p>
            )}
            {step !== "input" && (
              <p className="text-sm text-muted-foreground mt-1">
                AI is extracting details from your video
              </p>
            )}
          </div>
          {step !== "input" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-xs max-w-xs ml-4">
              <span className="text-base">🔗</span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-transparent border-none outline-none flex-1 text-xs font-medium"
              />
            </div>
          )}
          <button
            onClick={handleClose}
            className="ml-4 p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === "input" && (
            <div className="flex flex-col items-center justify-center py-12 px-8">
              <div className="w-full space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Paste TikTok or YouTube Shorts URL"
                      value={url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      onPaste={handlePaste}
                      autoFocus
                      className={`w-full py-5 px-6 text-lg border-2 rounded-xl focus:outline-none focus:ring-2 transition-all font-medium bg-muted/30 backdrop-blur-sm ${
                        url ? "pr-14" : ""
                      } ${
                        url && !isValidUrl
                          ? "border-red-500/50 focus:ring-red-500/30 focus:border-red-500 bg-red-50/50 dark:bg-red-950/20"
                          : isValidUrl
                            ? "border-green-500/50 focus:ring-green-500/30 focus:border-green-500 bg-green-50/50 dark:bg-green-950/20"
                            : "border-border/50 focus:ring-ring/30 focus:border-ring hover:border-border"
                      }`}
                    />
                    {url && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {isValidUrl ? (
                          <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                    )}
                  </div>

                  {url && !isValidUrl && (
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 justify-center animate-in fade-in duration-200">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Please enter a valid TikTok or YouTube Shorts URL
                      </span>
                    </p>
                  )}
                  {isValidUrl && (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 justify-center animate-in fade-in duration-200">
                      <Check className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Valid{" "}
                        {platform === "tiktok" ? "TikTok" : "YouTube Shorts"}{" "}
                        URL detected
                      </span>
                    </p>
                  )}

                  {!url && (
                    <p className="text-xs text-muted-foreground/70 text-center font-medium tracking-wide">
                      Supports: TikTok • YouTube Shorts
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(step === "processing" || step === "enriched") && (
            <div className="grid grid-cols-[420px_1fr] gap-8 p-8">
              <div className="flex flex-col gap-5">
                <div className="w-full aspect-[9/16] bg-muted rounded-2xl overflow-hidden relative shadow-lg">
                  {videoLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-10">
                      <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin" />
                      <div className="text-sm text-muted-foreground mt-4 font-medium">
                        Loading{" "}
                        {platform === "youtube" ? "YouTube Shorts" : "TikTok"}{" "}
                        video...
                      </div>
                    </div>
                  )}
                  {showEmbed && url && platform === "tiktok" && (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <TikTokEmbed url={url} width={420} />
                    </div>
                  )}
                  {showEmbed && url && platform === "youtube" && (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <YouTubeEmbed url={url} width={420} height={600} />
                    </div>
                  )}
                  {!showEmbed && (
                    <div className="w-full h-full flex items-center justify-center text-7xl bg-gradient-to-b from-muted to-accent">
                      ☕
                    </div>
                  )}
                </div>

                <div className="border border-border rounded-xl p-4 bg-card">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Add Context (Optional)
                  </div>
                  <textarea
                    placeholder="e.g., 'Perfect for Day 2 morning' or 'Must try their Vietnamese coffee'"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg text-sm resize-none min-h-24 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all font-medium"
                  />
                  <div className="text-xs text-muted-foreground mt-3">
                    💡 AI will use this to better understand your preferences
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto pr-3 space-y-6">
                <div className="p-4 border border-border rounded-xl bg-accent/50">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest">
                    <span className="text-lg">📝</span>
                    <span>Summary</span>
                  </div>
                  {enrichmentState.summary ? (
                    <div className="text-sm leading-relaxed text-foreground font-medium animate-in fade-in duration-300">
                      {enrichmentState.summary}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-3 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse" />
                      <div className="h-3 bg-gradient-to-r from-muted via-accent to-muted rounded-full w-5/6 animate-pulse" />
                      <div className="h-3 bg-gradient-to-r from-muted via-accent to-muted rounded-full w-4/6 animate-pulse" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                    Tags
                  </div>
                  {enrichmentState.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                      {enrichmentState.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-bold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-7 w-20 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {enrichmentState.photoUrl && !mainImageError && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Photos
                    </div>
                    <div className="rounded-xl overflow-hidden border border-border">
                      <img
                        src={enrichmentState.photoUrl}
                        alt={enrichmentState.place || "Place photo"}
                        className="w-full h-64 object-cover"
                        onError={() => setMainImageError(true)}
                      />
                    </div>
                    {enrichmentState.photos &&
                      enrichmentState.photos.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                          {enrichmentState.photos
                            .slice(1, 5)
                            .map((photoUrl, idx) => {
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

                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                    Place Details
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">📍</span>
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Location
                        </div>
                      </div>
                      {enrichmentState.place ? (
                        <div className="animate-in fade-in duration-300">
                          <div className="text-base font-bold text-foreground">
                            {enrichmentState.place}
                          </div>
                          {enrichmentState.address && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {enrichmentState.address}
                            </p>
                          )}
                          <span className="inline-block mt-2 px-2.5 py-1 bg-muted rounded-lg text-xs font-semibold text-muted-foreground">
                            {enrichmentState.location ||
                              currentTrip?.destination ||
                              "Location"}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="h-4 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse" />
                          <div className="h-5 w-24 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>

                    <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">⭐</span>
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Rating
                        </div>
                      </div>
                      {enrichmentState.rating ? (
                        <div className="animate-in fade-in duration-300">
                          <div className="text-base font-bold text-foreground">
                            {enrichmentState.rating} / 5.0
                          </div>
                          <span className="inline-block mt-2 px-2.5 py-1 bg-muted rounded-lg text-xs font-semibold text-muted-foreground">
                            {enrichmentState.reviewCount?.toLocaleString()}{" "}
                            reviews
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse" />
                          <div className="h-5 w-24 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>

                    <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">💰</span>
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Cost
                        </div>
                      </div>
                      {enrichmentState.price ? (
                        <div className="animate-in fade-in duration-300">
                          <div className="text-base font-bold text-foreground">
                            ₫80,000-150,000
                          </div>
                          <span className="inline-block mt-2 px-2.5 py-1 bg-muted rounded-lg text-xs font-semibold text-muted-foreground">
                            {enrichmentState.price}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse" />
                          <div className="h-5 w-24 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>

                    <div className="p-4 border border-border rounded-xl bg-card hover:border-foreground/20 transition-all">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">🕐</span>
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Best Time
                        </div>
                      </div>
                      {enrichmentState.place ? (
                        <div className="animate-in fade-in duration-300">
                          <div className="text-base font-bold text-foreground">
                            Morning-Afternoon
                          </div>
                          <span className="inline-block mt-2 px-2.5 py-1 bg-muted rounded-lg text-xs font-semibold text-muted-foreground">
                            8am-5pm
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="h-4 w-20 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse" />
                          <div className="h-5 w-24 bg-gradient-to-r from-muted via-accent to-muted rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(step === "processing" || step === "enriched") && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                      Google Reviews
                    </div>
                    <ReviewsSection
                      reviews={enrichmentState.reviews || undefined}
                      isLoading={!enrichmentState.reviews}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0 bg-background">
          <div className="text-sm text-muted-foreground min-h-[1.5rem]">
            {enrichmentState.status === "CREATED" && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-semibold">Starting enrichment</span>
              </div>
            )}
            {enrichmentState.status === "UNFURLED" && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-semibold">
                  Generating summary and tags
                </span>
                {retryCount > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Retry {retryCount}/2)
                  </span>
                )}
              </div>
            )}
            {enrichmentState.status === "SUMMARIZED" && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-semibold">
                  Searching for place details
                </span>
              </div>
            )}
            {enrichmentState.status === "ENRICHED" && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-semibold">Finalizing</span>
              </div>
            )}
            {enrichmentState.status === "DONE" && !isError && (
              <div className="flex items-center gap-2 text-foreground">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-semibold">Ready to add</span>
              </div>
            )}
            {enrichmentState.status === "DONE" && isError && (
              <div className="flex items-center gap-2 text-amber-600">
                <div className="w-2 h-2 rounded-full bg-amber-600" />
                <span className="font-semibold">
                  Partial enrichment - you can edit details later
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-6 min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={enrichmentState.status !== "DONE"}
              className="px-6 min-w-[120px] font-semibold"
            >
              Add to Trip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
