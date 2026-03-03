import { Star, Lightbulb } from "lucide-react";
import type { HotelRecommendation } from "../../types/itinerary";

interface HotelCardProps {
  hotel: HotelRecommendation;
}

export function HotelCard({ hotel }: HotelCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 shadow-sm overflow-hidden">
      {hotel.photoUrl && (
        <img
          src={hotel.photoUrl}
          alt={hotel.name}
          className="w-full h-28 object-cover"
        />
      )}
      <div className="p-2.5 space-y-0.5">
        <p className="font-semibold text-sm text-foreground">{hotel.name}</p>
        <div className="flex items-center gap-2 text-sm">
          {hotel.rating !== null && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{hotel.rating}</span>
            </span>
          )}
          {hotel.nightlyRate !== null && (
            <span className="font-medium text-sm">
              ~${hotel.nightlyRate}/night
            </span>
          )}
        </div>
        {hotel.address && (
          <p className="text-xs text-muted-foreground truncate">
            {hotel.address}
          </p>
        )}
        <p className="text-xs text-muted-foreground italic flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />
          {hotel.reason}
        </p>
      </div>
    </div>
  );
}
