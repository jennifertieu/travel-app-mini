import React, { useRef, useEffect, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDuringTripChat } from '../../hooks/useDuringTripChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import type { SuggestionCardData, FoodCardData } from '../../services/duringTripService';

interface ChatPanelProps {
  tripId: string;
  location?: { lat: number; lng: number; accuracy_meters?: number } | null;
  onClose?: () => void;
  className?: string;
}

function getCurrentTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function ChatPanel({ tripId, location, onClose, className }: ChatPanelProps) {
  const {
    state,
    messages,
    contextSummary,
    sendMessage,
    acceptSuggestion,
  } = useDuringTripChat({ tripId, location });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, state]);

  const isSending = state === 'sending';

  const handleAcceptSuggestion = useCallback((data: SuggestionCardData) => {
    acceptSuggestion(data, getCurrentTimeOfDay(), data.time_required_minutes || 60);
  }, [acceptSuggestion]);

  const handleAcceptFood = useCallback((data: FoodCardData) => {
    acceptSuggestion(data, getCurrentTimeOfDay(), 60);
  }, [acceptSuggestion]);

  const handleDirections = useCallback((coords: { lat: number; lng: number }, name: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&destination_place_id=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-sm">AI Assistant</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Sparkles className="w-10 h-10 text-primary/30 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              {contextSummary || 'Your AI trip assistant'}
            </p>
            <p className="text-xs text-muted-foreground">
              Ask me anything — restaurants, directions, local tips, or what to do next.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.text}
            cards={msg.cards}
            onAcceptSuggestion={handleAcceptSuggestion}
            onAcceptFood={handleAcceptFood}
            onDirections={handleDirections}
          />
        ))}

        {/* Sending indicator */}
        {isSending && (
          <ChatMessage role="assistant" content="" isStreaming />
        )}
      </div>

      {/* Quick actions */}
      <QuickActions onAction={sendMessage} disabled={isSending} />

      {/* Input */}
      <ChatInput
        onSendText={sendMessage}
        isSending={isSending}
      />
    </div>
  );
}
