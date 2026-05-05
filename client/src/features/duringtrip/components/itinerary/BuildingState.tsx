import { Loader2 } from "lucide-react";

export function BuildingState() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 mx-4 mt-4 rounded-lg bg-indigo-950 text-indigo-200 text-sm font-medium">
      <Loader2 className="w-4 h-4 animate-spin" />
      Building your itinerary with AI... This may take 15–30 seconds.
    </div>
  );
}
