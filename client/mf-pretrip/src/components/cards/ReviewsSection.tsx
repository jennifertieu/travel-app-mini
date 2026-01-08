"use client";

import { ReviewCard } from "./ReviewCard";
import { Card, CardContent } from "../ui/card";

interface PlaceReview {
  authorName: string;
  authorUrl?: string;
  rating: number;
  text?: string;
  time: number;
  relativeTimeDescription: string;
  profilePhotoUrl?: string;
  language?: string;
}

interface ReviewsSectionProps {
  reviews?: PlaceReview[];
  isLoading?: boolean;
}

export function ReviewsSection({
  reviews,
  isLoading = false,
}: ReviewsSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Reviews</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-20 bg-muted rounded animate-pulse flex-shrink-0" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-full bg-muted rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Reviews</h3>
        <Card className="border-0">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No reviews available for this place
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Reviews ({reviews.length})
      </h3>
      <div className="space-y-3">
        {reviews.map((review, index) => (
          <ReviewCard
            key={`${review.authorName}-${review.time}-${index}`}
            review={review}
          />
        ))}
      </div>
    </div>
  );
}

