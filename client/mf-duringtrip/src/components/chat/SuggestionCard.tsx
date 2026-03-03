import React, { useState } from 'react';
import { MapPin, Clock, Zap, Plus, Navigation, Loader2, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { SuggestionCardData } from '../../services/duringTripService';

interface SuggestionCardProps {
  data: SuggestionCardData;
  onAccept?: (data: SuggestionCardData) => void;
  onDirections?: (data: SuggestionCardData) => void;
  isAccepting?: boolean;
  isAccepted?: boolean;
  timeOfDay?: string;
}

const TYPE_STYLES: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  spontaneous: { label: 'Nearby', className: 'bg-emerald-100 text-emerald-700' },
  rest: { label: 'Rest', className: 'bg-amber-100 text-amber-700' },
};

const ENERGY_ICONS: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🔴',
};

export function SuggestionCard({ data, onAccept, onDirections, isAccepting, isAccepted, timeOfDay }: SuggestionCardProps) {
  const typeStyle = TYPE_STYLES[data.type] || TYPE_STYLES.spontaneous;
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-foreground truncate">{data.title}</h4>
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', typeStyle.className)}>
                {typeStyle.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{data.reason}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {data.distance_km < 1 ? `${Math.round(data.distance_km * 1000)}m` : `${data.distance_km}km`}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {data.time_required_minutes} min
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {ENERGY_ICONS[data.energy_level]} {data.energy_level}
          </span>
        </div>

        <div className="flex gap-2">
          {onAccept && !confirming && !isAccepted && !isAccepting && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-3.5 h-3.5" /> Add to itinerary
            </button>
          )}
          {onAccept && confirming && !isAccepted && !isAccepting && (
            <>
              <button
                type="button"
                onClick={() => { setConfirming(false); onAccept(data); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-500"
              >
                <Check className="w-3.5 h-3.5" /> Add to {timeOfDay ?? 'itinerary'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {onAccept && isAccepting && (
            <button
              type="button"
              disabled
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground opacity-60 cursor-wait"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...
            </button>
          )}
          {onAccept && isAccepted && (
            <button
              type="button"
              disabled
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-600 text-white cursor-default"
            >
              <Check className="w-3.5 h-3.5" /> Added
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
