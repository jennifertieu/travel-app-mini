import { Button } from "./ui/button";

interface EmptyStateStaysProps {
  onFindHotels: () => void;
  isSearching: boolean;
}

export function EmptyStateStays({
  onFindHotels,
  isSearching,
}: EmptyStateStaysProps) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-5xl mb-3 animate-pulse">🏨</div>
        <p className="text-sm text-muted-foreground">Searching for hotels...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-5xl mb-3">🏨</div>
      <h3 className="font-semibold text-sm mb-1">No hotels yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        We'll find great places to stay near your activities
      </p>
      <Button
        onClick={onFindHotels}
        size="sm"
        className="bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        Find Hotels
      </Button>
    </div>
  );
}
