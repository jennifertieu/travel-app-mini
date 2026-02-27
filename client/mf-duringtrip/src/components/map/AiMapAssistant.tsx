import React, { useState } from 'react';
import { X, ChevronRight, ChevronDown, MessageCircle, Camera, TreePine } from 'lucide-react';
import { cn } from '../../lib/utils';

// Sparkle icon matching the design (4-point star with small dot)
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
      <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface Suggestion {
  name: string;
  tag: string;
  walkTime: string;
  note: string;
  icon: React.ReactNode;
}

const PLACEHOLDER_SUGGESTIONS: Suggestion[] = [
  {
    name: 'Ponte Vecchio Viewpoint',
    tag: 'Viewpoint',
    walkTime: '3 min walk',
    note: 'Great light for photos right now',
    icon: <Camera className="w-5 h-5 text-primary" />,
  },
  {
    name: 'Giardino Botanico',
    tag: 'Hidden Gem',
    walkTime: '8 min walk',
    note: 'Quiet escape before your reservation',
    icon: <TreePine className="w-5 h-5 text-primary" />,
  },
];

const SUGGESTION_COUNT = 6;

interface AiMapAssistantProps {
  className?: string;
  /** Called when the user taps the "Ask" input — can route to chat tab */
  onAskPress?: () => void;
}

export function AiMapAssistant({ className, onAskPress }: AiMapAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
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
        {/* Badge */}
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-foreground text-[11px] font-semibold flex items-center justify-center shadow-sm border border-border">
          {SUGGESTION_COUNT}
        </span>
      </button>
    );
  }

  const visibleSuggestions = showAll ? PLACEHOLDER_SUGGESTIONS : PLACEHOLDER_SUGGESTIONS.slice(0, 2);

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
          <p className="text-sm font-semibold text-foreground">You have 45 minutes before lunch.</p>
          <p className="text-sm text-muted-foreground">Nearby options you might enjoy:</p>
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

      {/* Suggestion cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
        {visibleSuggestions.map((s) => (
          <button
            key={s.name}
            type="button"
            className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.tag} &middot; {s.walkTime}</p>
              <p className="text-xs text-muted-foreground/70">{s.note}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          </button>
        ))}
      </div>

      {/* Show more / Show less */}
      {PLACEHOLDER_SUGGESTIONS.length > 2 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', showAll && 'rotate-180')} />
          {showAll ? 'Show less' : 'Show more'}
        </button>
      )}

      <div className="border-t mx-4" />

      {/* Ask input */}
      <div className="p-4 pt-3">
        <button
          type="button"
          onClick={onAskPress}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-border bg-white hover:bg-muted/30 transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-foreground" />
          <span className="text-sm text-muted-foreground">Need something specific? Ask</span>
        </button>
      </div>
    </div>
  );
}
