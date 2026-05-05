import React from 'react';
import { MapPin, Clock, Star, Plus, Navigation, Leaf } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FoodCardData } from '../../services/duringTripService';

interface FoodCardProps {
  data: FoodCardData;
  onAccept?: (data: FoodCardData) => void;
  onDirections?: (data: FoodCardData) => void;
}

const TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  quick_bite: 'Quick Bite',
  park_rest: 'Rest Spot',
};

function PriceDots({ level }: { level: number }) {
  return (
    <span className="text-xs text-muted-foreground">
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} className={cn(i < level ? 'text-foreground' : 'text-muted-foreground/30')}>$</span>
      ))}
    </span>
  );
}

export function FoodCard({ data, onAccept, onDirections }: FoodCardProps) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
      {data.photo_url && (
        <div className="h-24 w-full overflow-hidden">
          <img src={data.photo_url} alt={data.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-foreground truncate">{data.name}</h4>
              {data.dietary_match && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                  <Leaf className="w-2.5 h-2.5" />
                  Match
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{TYPE_LABELS[data.type] || data.type}</span>
              {data.cuisine && (
                <>
                  <span>&middot;</span>
                  <span>{data.cuisine}</span>
                </>
              )}
              <PriceDots level={data.price_level} />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">{data.reason}</p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {data.distance_km < 1 ? `${Math.round(data.distance_km * 1000)}m` : `${data.distance_km}km`}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {data.walking_time_minutes} min walk
          </span>
          {data.rating && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {data.rating}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {onAccept && (
            <button
              type="button"
              onClick={() => onAccept(data)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add to itinerary
            </button>
          )}
          {onDirections && (
            <button
              type="button"
              onClick={() => onDirections(data)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              Directions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
