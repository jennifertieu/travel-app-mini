import { Star } from "lucide-react";
import type { HotelRecommendation } from "../types";

interface HotelCardProps {
  hotel: HotelRecommendation;
}

export function HotelCard({ hotel }: HotelCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {hotel.photoUrl && (
        <img
          src={hotel.photoUrl}
          alt={hotel.name}
          className="w-full h-40 object-cover"
        />
      )}
      <div className="p-3 space-y-1">
        <p className="font-semibold text-sm">{hotel.name}</p>
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
        <p className="text-xs text-muted-foreground italic">
          💡 {hotel.reason}
        </p>
      </div>
    </div>
  );
}
