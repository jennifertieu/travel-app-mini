import React, { useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import type { ConversationMessage } from '../../types/voice';

interface TranscriptDisplayProps {
  transcript: string;
  conversationHistory: ConversationMessage[];
  isVisible: boolean;
  className?: string;
}

export function TranscriptDisplay({
  transcript,
  conversationHistory,
  isVisible,
  className,
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, conversationHistory]);

  if (!isVisible) {
    return null;
  }

  const hasContent = conversationHistory.length > 0 || transcript;

  return (
    <div
      className={cn(
        'w-full px-4',
        'transition-all duration-300',
        className
      )}
    >
      <div
        ref={scrollRef}
        className={cn(
          'bg-muted/50 rounded-lg p-3',
          'max-h-48 overflow-y-auto',
          'text-sm',
          'scrollbar-thin scrollbar-thumb-muted-foreground/20'
        )}
      >
        {!hasContent ? (
          <span className="text-muted-foreground italic">
            Transcript will appear here...
          </span>
        ) : (
          <div className="space-y-3">
            {/* Conversation history */}
            {conversationHistory.map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className={cn(
                  'rounded-lg px-3 py-2',
                  message.role === 'assistant'
                    ? 'bg-primary/10 text-foreground'
                    : 'bg-secondary text-secondary-foreground ml-4'
                )}
              >
                <span className="text-xs font-medium text-muted-foreground block mb-1">
                  {message.role === 'assistant' ? 'Assistant' : 'You'}
                </span>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}

            {/* Current streaming transcript */}
            {transcript && (
              <div className="bg-primary/10 text-foreground rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground block mb-1">
                  Assistant
                </span>
                <p className="whitespace-pre-wrap">{transcript}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
