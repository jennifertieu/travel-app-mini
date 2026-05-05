import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SuggestionCard } from './SuggestionCard';
import { FoodCard } from './FoodCard';
import type { ChatCard, SuggestionCardData, FoodCardData } from '../../services/duringTripService';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  cards?: ChatCard[];
  isStreaming?: boolean;
  onAcceptSuggestion?: (data: SuggestionCardData) => void;
  onAcceptFood?: (data: FoodCardData) => void;
  onDirections?: (coords: { lat: number; lng: number }, name: string) => void;
  acceptingId?: string | null;
  acceptedIds?: Set<string>;
  timeOfDay?: string;
}

export function ChatMessage({
  role,
  content,
  cards,
  isStreaming,
  onAcceptSuggestion,
  onAcceptFood,
  onDirections,
  acceptingId,
  acceptedIds,
  timeOfDay,
}: ChatMessageProps) {
  if (role === 'assistant') {
    return (
      <div className="flex items-start gap-2 max-w-[90%]">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {(content || isStreaming) && (
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
              {content}
              {isStreaming && !content && <StreamingDots />}
            </div>
          )}

          {cards && cards.length > 0 && (
            <div className="space-y-2">
              {cards.map((card, i) => {
                if (card.type === 'suggestion') {
                  const sd = card.data as SuggestionCardData;
                  return (
                    <SuggestionCard
                      key={i}
                      data={sd}
                      onAccept={onAcceptSuggestion}
                      onDirections={onDirections
                        ? (d) => onDirections(d.coordinates, d.title)
                        : undefined
                      }
                      isAccepting={acceptingId === sd.id}
                      isAccepted={acceptedIds?.has(sd.id)}
                      timeOfDay={timeOfDay}
                    />
                  );
                }
                if (card.type === 'food') {
                  return (
                    <FoodCard
                      key={i}
                      data={card.data as FoodCardData}
                      onAccept={onAcceptFood}
                      onDirections={onDirections
                        ? (d) => onDirections(d.coordinates, d.name)
                        : undefined
                      }
                    />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm max-w-[85%]">
        {content}
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
