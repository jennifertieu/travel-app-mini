"use client";

import { TripHeader } from "../layout/TripHeader";
import { IdeaCardSkeleton } from "../cards/IdeaCardSkeleton";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-muted rounded-md ${className || ""}`}
      style={{ animationDuration: "1.5s" }}
    />
  );
}

export interface TripViewSkeletonProps {
  onTripSelect: (tripId: string) => void;
  isGenerating?: boolean;
}

export function TripViewSkeleton({
  onTripSelect,
  isGenerating = false,
}: TripViewSkeletonProps) {
  return (
    <div className="h-full flex bg-background">
      {/* Left: Header + Map */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TripHeader trip={null} onTripSelect={onTripSelect} />

        {/* Map area skeleton */}
        <div className="flex-1 relative">
          <Skeleton className="w-full h-full min-h-0 rounded-none" />
          {isGenerating && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <p className="text-base font-medium text-muted-foreground">
                Curating activities for you...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar skeleton - matches IdeaSidebar structure */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-background border-l overflow-hidden">
        {/* Tabbed header skeleton */}
        <div className="flex-shrink-0 h-[71px] border-b bg-background flex items-center px-4">
          <Skeleton className="w-full h-9 rounded-lg" />
        </div>

        {/* Content area - 4-5 IdeaCardSkeleton cards */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <IdeaCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Footer skeleton */}
        <div className="flex-shrink-0 border-t bg-background px-4 py-3 flex items-center justify-between">
          <Skeleton className="w-16 h-4" />
          <Skeleton className="w-12 h-7 rounded-md" />
        </div>
      </div>
    </div>
  );
}
