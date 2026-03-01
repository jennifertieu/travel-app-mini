import { Loader2 } from "lucide-react";
import { MapPanel } from "./MapPanel";
import type { Annotation } from "../lib/annotation-utils";

/* ── Building Banner (indigo bar with spinner, no timer) ── */
function BuildingBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 mx-4 mt-4 rounded-lg bg-indigo-950 text-indigo-200 text-sm font-medium">
      <Loader2 className="w-4 h-4 animate-spin" />
      Building your itinerary with AI... This may take 15–30 seconds.
    </div>
  );
}

/* ── Activity Card Skeleton ── */
function ActivityCardSkeleton() {
  return (
    <div className="w-full flex gap-3 rounded-xl border border-gray-200 dark:border-zinc-700/60 p-3 bg-gray-50 dark:bg-zinc-800/60">
      <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-gray-200 dark:bg-zinc-700" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 w-3/5 rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="h-3 w-2/5 rounded bg-gray-200 dark:bg-zinc-700" />
        <div className="h-3 w-[30%] rounded bg-gray-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

/* ── Section Header Skeleton (timeline dot + label) ── */
function SectionHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700" />
      <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-zinc-700" />
    </div>
  );
}

/* ── Time-of-Day Section Skeleton ── */
function TimeOfDaySectionSkeleton({ cards }: { cards: number }) {
  return (
    <div className="space-y-3">
      <SectionHeaderSkeleton />
      {Array.from({ length: cards }, (_, i) => (
        <ActivityCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── Itinerary Panel Skeleton (left half) ── */
function ItineraryPanelSkeleton() {
  return (
    <div className="w-1/2 overflow-y-auto flex flex-col relative">
      <BuildingBanner />

      <div className="animate-pulse flex-1 px-4 py-4 space-y-4 pl-8">
        {/* Header skeleton (h-11) */}
        <div className="h-11 flex items-center justify-between">
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-zinc-700" />
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-zinc-700" />
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-zinc-700" />
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-zinc-700" />
          </div>
        </div>

        {/* Day tabs skeleton (4 pills) */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 w-20 rounded-full bg-gray-200 dark:bg-zinc-700"
            />
          ))}
        </div>

        {/* Timeline line + sections */}
        <div className="relative border-l-2 border-teal-500/20 pl-6 space-y-6">
          <TimeOfDaySectionSkeleton cards={3} />
          <TimeOfDaySectionSkeleton cards={2} />
          <TimeOfDaySectionSkeleton cards={2} />
        </div>
      </div>

      {/* Bottom bar skeleton */}
      <div className="sticky bottom-0 border-t border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 flex justify-end gap-3">
        <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-zinc-700" />
        <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}

interface SkeletonLoaderProps {
  annotations?: Annotation[];
  initialCenter?: [number, number];
}

/* ── Main SkeletonLoader ── */
export function SkeletonLoader({
  annotations,
  initialCenter,
}: SkeletonLoaderProps) {
  return (
    <div className="flex flex-1 min-h-0">
      <ItineraryPanelSkeleton />
      <div className="w-1/2 relative">
        <MapPanel
          activities={[]}
          annotations={annotations}
          initialCenter={initialCenter}
        />
      </div>
    </div>
  );
}
