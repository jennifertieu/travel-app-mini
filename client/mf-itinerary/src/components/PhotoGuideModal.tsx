import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Camera,
  MapPin,
  Clock,
  Users,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Aperture,
  Crosshair,
  RefreshCw,
} from "lucide-react";
import { usePhotoGuide } from "../hooks/usePhotoGuide";
import type { SpotPhotosMap } from "../hooks/usePhotoGuide";
import { cn } from "../lib/utils";
import type {
  PhotoGuideData,
  PhotoTip,
  PhotoChallengeDifficulty,
} from "../types";

interface PhotoGuideModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string | null;
  dayNumber: number;
  /** When true, render content inline in the panel (no overlay/modal). */
  inline?: boolean;
}

const DIFFICULTY_LABELS: Record<PhotoChallengeDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  silly: "Silly",
};

const DIFFICULTY_COLORS: Record<PhotoChallengeDifficulty, string> = {
  easy: "bg-green-500/20 text-green-700 dark:text-green-300",
  medium: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  silly: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
};

/** Collect all available photos for a tip: reel idea photos → image_urls → image_url */
function getPhotosForTip(tip: PhotoTip, spotPhotos: SpotPhotosMap): string[] {
  // Prefer reel idea photos (up to 5 from Google Places)
  const reelPhotos = spotPhotos[tip.activity_name];
  if (reelPhotos?.length) return reelPhotos;
  // Fallback to image_urls from photo guide
  if (tip.image_urls?.length) return tip.image_urls;
  // Fallback to single image_url
  if (tip.image_url) return [tip.image_url];
  return [];
}

/** Compact Pose of the Day banner */
function PoseOfTheDayBanner({
  pose,
}: {
  pose: PhotoGuideData["pose_of_the_day"];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-4 rounded-xl bg-muted/50 px-4 py-3"
    >
      <div className="w-8 h-8 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
        <Crosshair className="w-4 h-4 text-teal-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Pose of the Day
          </span>
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-px rounded-full",
              DIFFICULTY_COLORS[pose.difficulty],
            )}
          >
            {DIFFICULTY_LABELS[pose.difficulty]}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground truncate">
          {pose.title}
        </p>
      </div>
      <p className="text-xs text-muted-foreground max-w-[260px] hidden lg:block leading-relaxed">
        {pose.description}
      </p>
    </motion.div>
  );
}

/** Photo gallery: hero image + thumbnail strip */
function PhotoGallery({
  photos,
  activityName,
}: {
  photos: string[];
  activityName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(0, photos.length - 1));

  if (photos.length === 0) {
    return (
      <div className="flex-1 rounded-xl bg-muted/50 flex flex-col items-center justify-center gap-3 min-h-[320px]">
        <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No photos available</p>
      </div>
    );
  }

  const canPrev = safeIndex > 0;
  const canNext = safeIndex < photos.length - 1;

  return (
    <div className="flex-1 flex flex-col gap-2 min-w-0">
      {/* Hero image */}
      <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3] group">
        <AnimatePresence mode="wait">
          <motion.img
            key={photos[safeIndex]}
            src={photos[safeIndex]}
            alt={`${activityName} photo ${safeIndex + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </AnimatePresence>

        {/* Nav arrows */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => canPrev && setActiveIndex(safeIndex - 1)}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                !canPrev && "invisible",
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => canNext && setActiveIndex(safeIndex + 1)}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                !canNext && "invisible",
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Counter badge */}
        {photos.length > 1 && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium">
            {safeIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                i === safeIndex
                  ? "border-teal-500 ring-1 ring-teal-500/30 scale-105"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Right panel: spot info, tips, selfie CTA */
function SpotInfo({
  tip,
  onGenerateSelfie,
  onRefetch,
}: {
  tip: PhotoTip;
  onGenerateSelfie?: (activityName: string, options?: { regenerate?: boolean }) => Promise<string | null>;
  onRefetch?: () => Promise<void>;
}) {
  const hasImage = Boolean(tip.image_url || tip.image_urls?.length);
  const [selfieLoading, setSelfieLoading] = useState(false);
  const hasCached = Boolean(tip.generated_selfie_base64);

  const handleGenerateSelfie = async () => {
    if (!onGenerateSelfie) return;
    setSelfieLoading(true);
    try {
      const url = await onGenerateSelfie(tip.activity_name, { regenerate: hasCached });
      if (url) {
        await onRefetch?.();
      }
    } finally {
      setSelfieLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-[340px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto"
    >
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground leading-snug tracking-tight">
          {tip.activity_name}
        </h3>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
          <Clock className="w-3 h-3" />
          {tip.best_time}
        </span>
      </div>

      {/* How to shoot */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-teal-600" />
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest">
            How to Shoot
          </p>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">
          {tip.selfie_tip}
        </p>
        <p className="text-[13px] text-muted-foreground italic leading-relaxed">
          {tip.pose_idea}
        </p>
      </div>

      {/* Group tip */}
      {tip.is_group_spot && tip.group_tip && (
        <div className="flex items-start gap-2 rounded-lg bg-teal-600/10 p-3">
          <Users className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{tip.group_tip}</p>
        </div>
      )}

      {/* Challenge */}
      {tip.challenge && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            {tip.challenge.description}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              DIFFICULTY_COLORS[tip.challenge.difficulty],
            )}
          >
            {DIFFICULTY_LABELS[tip.challenge.difficulty]}
          </span>
        </div>
      )}

      {/* Generate selfie CTA */}
      {onGenerateSelfie && hasImage && (
        <div className="space-y-3 pt-3 border-t border-border/60 mt-auto">
          <button
            type="button"
            onClick={handleGenerateSelfie}
            disabled={selfieLoading}
            className="flex items-center gap-2 w-full justify-center px-3 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium shadow-sm hover:bg-teal-700 active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {selfieLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {selfieLoading
              ? "Generating…"
              : hasCached
                ? "Regenerate example"
                : "See an example selfie"}
          </button>
        </div>
      )}
    </motion.div>
  );
}

/** Spot navigation tabs at the bottom */
function SpotNav({
  tips,
  activeIndex,
  onSelect,
  spotPhotos,
}: {
  tips: PhotoTip[];
  activeIndex: number;
  onSelect: (index: number) => void;
  spotPhotos: SpotPhotosMap;
}) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
      {tips.map((tip, index) => {
        const photos = getPhotosForTip(tip, spotPhotos);
        const thumbUrl = photos[0];
        const isActive = index === activeIndex;
        return (
          <button
            key={tip.activity_name}
            type="button"
            onClick={() => onSelect(index)}
            className={cn(
              "flex-shrink-0 flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all text-left min-w-[200px] max-w-[280px]",
              isActive
                ? "border-teal-500/60 bg-teal-500/5 shadow-sm ring-1 ring-teal-500/20"
                : "border-border/60 hover:border-border hover:bg-muted/40",
            )}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-muted-foreground/60" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  isActive ? "text-foreground" : "text-foreground/80",
                )}
              >
                {tip.activity_name}
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                {tip.best_time}
                {photos.length > 1 && (
                  <span className="text-muted-foreground/60">
                    · {photos.length} photos
                  </span>
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="flex gap-6 p-6">
      <div className="flex-1 space-y-3">
        <div className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-14 h-14 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
      <div className="w-[340px] space-y-4">
        <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
        <div className="h-20 rounded bg-muted animate-pulse" />
        <div className="h-16 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function PhotoGuideModal({
  open,
  onClose,
  tripId,
  dayNumber,
  inline = false,
}: PhotoGuideModalProps) {
  const {
    data,
    spotPhotos,
    isLoading,
    regenerateAllLoading,
    error,
    generate,
    generateAll,
    refetch,
    generateSelfie,
    regenerateAllSelfies,
  } = usePhotoGuide(tripId, dayNumber);
  const [activeSpotIndex, setActiveSpotIndex] = useState(0);

  if (!open) return null;

  const tipCount = data?.tips?.length ?? 0;
  const safeIndex = Math.min(activeSpotIndex, Math.max(0, tipCount - 1));
  const activeTip = data?.tips?.[safeIndex];
  const placePhotos = activeTip ? getPhotosForTip(activeTip, spotPhotos) : [];
  /** Gallery shows AI example first (if present), then place photos — so 6 total when we have 5 + AI. */
  const galleryPhotos =
    activeTip?.generated_selfie_base64
      ? [`data:image/png;base64,${activeTip.generated_selfie_base64}`, ...placePhotos]
      : placePhotos;
  const tipsWithImages = data?.tips?.filter(
    (t) => t.image_url || (t.image_urls?.length ?? 0) > 0,
  ) ?? [];
  const canRegenerateAll = tipsWithImages.length > 0;

  const header = (
    <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border/60">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-600/10 flex items-center justify-center">
          <Aperture className="w-[18px] h-[18px] text-teal-600" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">
            Day {dayNumber} Photo Guide
          </h1>
          {tipCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {tipCount} spot{tipCount !== 1 ? "s" : ""} to capture
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {data && canRegenerateAll && (
          <button
            type="button"
            onClick={regenerateAllSelfies}
            disabled={regenerateAllLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {regenerateAllLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Regenerate all
          </button>
        )}
        {!inline && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const body = (
    <div className="flex-1 overflow-y-auto min-h-0">
            {error && (
              <div className="mx-6 mt-4 rounded-xl bg-red-500/10 text-red-700 dark:text-red-300 text-sm px-4 py-3">
                {error}
              </div>
            )}

            {isLoading && !data && <SkeletonLoader />}

            {!isLoading && !data && !error && (
              <div className="py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto mb-5">
                  <Aperture className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
                  Generate selfie tips, pose ideas, and photo challenges for
                  each spot on this day.
                </p>
                <button
                  type="button"
                  onClick={generate}
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 text-white font-medium text-sm shadow-sm hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {isLoading ? "Generating…" : "Generate Photo Guide"}
                </button>
              </div>
            )}

            {data && (
              <div className="flex flex-col">
                {/* Pose of the Day banner */}
                <div className="px-6 pt-4">
                  <PoseOfTheDayBanner pose={data.pose_of_the_day} />
                </div>

                {/* Two-panel content: gallery + info */}
                {activeTip && (
                  <div className="flex gap-6 px-6 pt-5 pb-3 min-h-[380px]">
                    <PhotoGallery
                      photos={galleryPhotos}
                      activityName={activeTip.activity_name}
                    />
                    <SpotInfo
                      tip={activeTip}
                      onGenerateSelfie={generateSelfie}
                      onRefetch={refetch}
                    />
                  </div>
                )}

                {/* Spot navigation */}
                {tipCount > 1 && (
                  <div className="px-6 pb-5 pt-3 border-t border-border/60">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2.5">
                      Photo Spots
                    </p>
                    <SpotNav
                      tips={data.tips}
                      activeIndex={safeIndex}
                      onSelect={setActiveSpotIndex}
                      spotPhotos={spotPhotos}
                    />
                  </div>
                )}
              </div>
            )}
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
        {header}
        {body}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-background rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {header}
          {body}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
