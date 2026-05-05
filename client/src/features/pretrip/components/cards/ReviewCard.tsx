"use client";

import { Card, CardContent } from "../ui/card";
import { Star } from "lucide-react";
import { useState } from "react";

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

interface ReviewCardProps {
  review: PlaceReview;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const MAX_TEXT_LENGTH = 150;

  const needsTruncation = review.text && review.text.length > MAX_TEXT_LENGTH;
  const displayText =
    needsTruncation && !isExpanded
      ? review.text!.substring(0, MAX_TEXT_LENGTH) + "..."
      : review.text;

  const renderStars = () => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= review.rating
                ? "fill-foreground text-foreground"
                : "fill-none text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="border-0">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {review.profilePhotoUrl && !imageError ? (
              <img
                src={review.profilePhotoUrl}
                alt={review.authorName}
                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-foreground">
                  {review.authorName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {review.authorName}
              </p>
              <p className="text-xs text-muted-foreground">
                {review.relativeTimeDescription}
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">{renderStars()}</div>
        </div>

        {review.text && (
          <div className="space-y-1">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {displayText}
            </p>
            {needsTruncation && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

