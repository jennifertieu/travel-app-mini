import { useState, useCallback } from 'react';
import { X, ChevronRight, ChevronDown, MessageCircle, Clock, Compass, Coffee, Loader2, RefreshCw, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getDecision, acceptSuggestion as acceptSuggestionApi, type SuggestionCardData } from '../../services/duringTripService';
import { SuggestionCard } from '../chat/SuggestionCard';

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
      <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const TYPE_CONFIG: Record<string, { icon: typeof Clock; label: string }> = {
  scheduled: { icon: Clock, label: 'Scheduled' },
  spontaneous: { icon: Compass, label: 'Nearby' },
  rest: { icon: Coffee, label: 'Rest' },
};

function getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

interface AiTripAssistantProps {
  tripId: string;
  location: { lat: number; lng: number; accuracy_meters?: number } | null;
  className?: string;
  onAskPress?: (suggestions: SuggestionCardData[], contextSummary: string | null) => void;
  demoTime?: Date | null;
  currentDayNumber?: number;
  onItineraryUpdated?: () => void;
}

export function AiTripAssistant({ tripId, location, className, onAskPress, demoTime, currentDayNumber, onItineraryUpdated }: AiTripAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionCardData[]>([]);
  const [contextSummary, setContextSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDecision(tripId, location, demoTime);
      setSuggestions(data.options ?? []);
      setContextSummary(data.context_summary ?? null);
      setFetchedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, location, demoTime]);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
    if (suggestions.length === 0 && !isLoading) {
      fetchSuggestions();
    }
  }, [suggestions.length, isLoading, fetchSuggestions]);

  const handleAccept = useCallback(async (data: SuggestionCardData) => {
    setAcceptingId(data.id);
    try {
      const tod: 'morning' | 'afternoon' | 'evening' = demoTime
        ? (demoTime.getHours() < 12 ? 'morning' : demoTime.getHours() < 17 ? 'afternoon' : 'evening')
        : getCurrentTimeOfDay();
      const result = await acceptSuggestionApi({
        tripId,
        suggestion: data,
        timeOfDay: tod,
        durationMinutes: data.time_required_minutes || 60,
        dayNumber: currentDayNumber,
        currentTime: demoTime,
      });
      if (result.success) {
        setAcceptedIds(prev => new Set(prev).add(data.id));
        onItineraryUpdated?.();
      }
    } catch {
      // error visible via button reset
    } finally {
      setAcceptingId(null);
    }
  }, [tripId, demoTime, currentDayNumber, onItineraryUpdated]);

  const handleDirections = useCallback((data: SuggestionCardData) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${data.coordinates.lat},${data.coordinates.lng}&destination_place_id=${encodeURIComponent(data.title)}`;
    window.open(url, '_blank');
  }, []);

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        className={cn(
          'absolute top-[30px] right-4 z-[500]',
          'w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'hover:bg-primary/90 transition-colors',
          className
        )}
        aria-label="AI suggestions"
      >
        <SparkleIcon className="w-6 h-6" />
      </button>
    );
  }

  const visibleSuggestions = showAll ? suggestions : suggestions.slice(0, 3);

  return (
    <div
      className={cn(
        'absolute top-2 left-2 right-2 z-[500]',
        'bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)]',
        'flex flex-col max-h-[60vh]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <SparkleIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Thinking...</p>
          ) : contextSummary ? (
            <p className="text-sm font-semibold text-foreground">{contextSummary}</p>
          ) : (
            <p className="text-sm font-semibold text-foreground">What should you do next?</p>
          )}
          {!isLoading && suggestions.length > 0 && (
            <p className="text-sm text-muted-foreground">Nearby options you might enjoy:</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close suggestions"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="px-4 pb-3 space-y-2">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchSuggestions}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}

      {/* Suggestion cards */}
      {!isLoading && !error && suggestions.length > 0 && (
        <>
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
            {visibleSuggestions.map((s) => {
              const config = TYPE_CONFIG[s.type] ?? TYPE_CONFIG.spontaneous;
              const Icon = config.icon;
              const isDetailExpanded = expandedId === s.id;
              const distanceStr = s.distance_km < 1
                ? `${Math.round(s.distance_km * 1000)}m`
                : `${s.distance_km.toFixed(1)}km`;
              const timeStr = s.time_required_minutes >= 60
                ? `${Math.floor(s.time_required_minutes / 60)}h${s.time_required_minutes % 60 ? ` ${s.time_required_minutes % 60}m` : ''}`
                : `${s.time_required_minutes}m`;

              return (
                <div key={s.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isDetailExpanded ? null : s.id)}
                    className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{config.label} &middot; {distanceStr} &middot; {timeStr}</p>
                      {!isDetailExpanded && (
                        <p className="text-xs text-muted-foreground/70 line-clamp-1">{s.reason}</p>
                      )}
                    </div>
                    <ChevronRight className={cn('w-4 h-4 text-muted-foreground/50 shrink-0 transition-transform', isDetailExpanded && 'rotate-90')} />
                  </button>
                  {isDetailExpanded && (
                    <div className="mt-1">
                      <SuggestionCard
                        data={s}
                        onAccept={handleAccept}
                        onDirections={handleDirections}
                        isAccepting={acceptingId === s.id}
                        isAccepted={acceptedIds.has(s.id)}
                        timeOfDay={demoTime ? (demoTime.getHours() < 12 ? 'morning' : demoTime.getHours() < 17 ? 'afternoon' : 'evening') : getCurrentTimeOfDay()}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {suggestions.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn('w-4 h-4 transition-transform', showAll && 'rotate-180')} />
              {showAll ? 'Show less' : `Show all ${suggestions.length}`}
            </button>
          )}
        </>
      )}

      {/* Empty state */}
      {!isLoading && !error && suggestions.length === 0 && (
        <div className="px-4 pb-3">
          <p className="text-sm text-muted-foreground">No suggestions available right now.</p>
        </div>
      )}

      <div className="border-t mx-4" />

      {/* Footer actions */}
      {fetchedAt && !isLoading && (
        <p className="text-[11px] text-muted-foreground/60 text-center pb-1">
          Updated {fetchedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
      <div className="flex items-center gap-2 p-4 pt-3">
        <button
          type="button"
          onClick={() => onAskPress?.(suggestions, contextSummary)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-border bg-white hover:bg-muted/30 transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-foreground" />
          <span className="text-sm text-muted-foreground">Ask AI</span>
        </button>
        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="shrink-0 w-11 h-11 rounded-full border border-border bg-white hover:bg-muted/30 transition-colors flex items-center justify-center disabled:opacity-50"
          aria-label="Refresh suggestions"
        >
          <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isLoading && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
}
