import { Card, CardContent, CardHeader } from "../ui/card";

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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 px-4 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-16 h-5 rounded-full" />
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Image placeholder */}
        <Skeleton className="w-full h-36 -mx-4 -mt-1 rounded-none" />

        {/* Title */}
        <div className="space-y-2">
          <Skeleton className="w-3/4 h-5" />
          <Skeleton className="w-1/2 h-5" />
        </div>

        {/* Location */}
        <div className="flex items-start gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="w-2/3 h-4" />
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-5/6 h-4" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="w-16 h-5 rounded-full" />
          <Skeleton className="w-20 h-5 rounded-full" />
          <Skeleton className="w-14 h-5 rounded-full" />
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="w-10 h-4" />
          <Skeleton className="w-12 h-4" />
          <Skeleton className="w-10 h-4" />
        </div>
      </CardContent>
    </Card>
  );
}
