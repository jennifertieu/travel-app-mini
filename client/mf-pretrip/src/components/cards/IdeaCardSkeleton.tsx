import { Card, CardContent } from "../ui/card";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-muted rounded-md ${className || ""}`}
      style={{ animationDuration: "1.5s" }}
    />
  );
}

export function IdeaCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-sm border-border/50">
      {/* Image placeholder */}
      <Skeleton className="w-full h-40 rounded-none" />

      <CardContent className="p-4 space-y-2.5">
        {/* Title & Rating */}
        <div className="flex justify-between items-start gap-2">
          <Skeleton className="w-3/4 h-5" />
          <Skeleton className="w-10 h-5" />
        </div>

        {/* Location */}
        <div className="flex items-start gap-1.5">
          <Skeleton className="w-3.5 h-3.5 rounded-full" />
          <Skeleton className="w-1/2 h-3.5" />
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-16 h-3" />
          <Skeleton className="w-16 h-3" />
        </div>

        {/* Summary */}
        <div className="space-y-1.5 pt-1">
          <Skeleton className="w-full h-3.5" />
          <Skeleton className="w-5/6 h-3.5" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Skeleton className="w-12 h-5 rounded-md" />
          <Skeleton className="w-16 h-5 rounded-md" />
          <Skeleton className="w-10 h-5 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
