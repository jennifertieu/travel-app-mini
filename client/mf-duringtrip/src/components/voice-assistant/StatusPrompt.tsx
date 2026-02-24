import React from 'react';
import { cn } from '../../lib/utils';
import type { VoiceState, TripContext } from '../../types/voice';

interface StatusPromptProps {
  state: VoiceState;
  tripContext?: TripContext | null;
  error?: string | null;
  className?: string;
}

export function StatusPrompt({
  state,
  tripContext,
  error,
  className,
}: StatusPromptProps) {
  // Generate contextual prompt based on trip context
  const getContextualPrompt = (): string => {
    if (!tripContext?.destination) {
      return 'Ask me anything about your travels!';
    }
    return `Ask me anything about ${tripContext.destination}!`;
  };

  // Get status message based on state
  const getStatusMessage = (): string => {
    switch (state) {
      case 'listening':
        return "I'm listening...";
      case 'processing':
        return 'Processing...';
      case 'streaming':
      case 'speaking':
        return 'Speaking...';
      case 'interrupted':
        return 'Interrupted';
      default:
        return getContextualPrompt();
    }
  };

  // Get status color based on state
  const getStatusColor = (): string => {
    if (error) return 'text-destructive';
    switch (state) {
      case 'listening':
        return 'text-primary';
      case 'processing':
        return 'text-muted-foreground';
      case 'streaming':
      case 'speaking':
        return 'text-primary';
      case 'interrupted':
        return 'text-amber-500';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className={cn('text-center px-4', className)}>
      {error ? (
        <p className="text-destructive text-sm font-medium">{error}</p>
      ) : (
        <p
          className={cn(
            'text-base font-medium transition-colors duration-200',
            getStatusColor()
          )}
        >
          {getStatusMessage()}
        </p>
      )}

      {/* Contextual hints */}
      {state === 'idle' && !error && tripContext?.savedPlaces && tripContext.savedPlaces.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Try: "Tell me about {tripContext.savedPlaces[0]?.name}"
        </p>
      )}
    </div>
  );
}
