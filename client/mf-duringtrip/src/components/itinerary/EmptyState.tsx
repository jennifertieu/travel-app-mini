import { MapPin } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <MapPin className="w-12 h-12 text-muted-foreground/40 mb-4" />
      <p className="text-sm text-muted-foreground">
        No itinerary found for this trip yet.
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Go to Pre-Trip and click "Build Trip" to generate one.
      </p>
    </div>
  );
}
