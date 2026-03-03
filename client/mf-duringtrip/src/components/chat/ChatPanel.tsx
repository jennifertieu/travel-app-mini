import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDuringTripChat } from '../../hooks/useDuringTripChat';
import { useChatAgent } from '../../hooks/useChatAgent';
import { ChatMessage as TripChatMessage } from './ChatMessage';
import { MessageBubble } from './MessageBubble';
import { ChangesPreview } from './ChangesPreview';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import type { SuggestionCardData, FoodCardData, ChatCard } from '../../services/duringTripService';
import type { ChatMessage } from '../../types/itinerary';

export interface InitialSuggestions {
  suggestions: SuggestionCardData[];
  contextSummary: string | null;
  _ts?: number;
}

interface ChatPanelProps {
  tripId: string;
  itineraryRowId?: string;
  location?: { lat: number; lng: number; accuracy_meters?: number } | null;
  onClose?: () => void;
  className?: string;
  initialSuggestions?: InitialSuggestions | null;
  demoTime?: Date | null;
  currentDayNumber?: number;
  onItineraryUpdated?: () => void;
}

function getTimeOfDay(date?: Date | null): 'morning' | 'afternoon' | 'evening' {
  const hour = (date ?? new Date()).getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function ChatPanel({
  tripId,
  itineraryRowId,
  location,
  onClose,
  className,
  initialSuggestions,
  demoTime,
  currentDayNumber,
  onItineraryUpdated,
}: ChatPanelProps) {
  // Trip assistant — handles quick actions, suggestion cards, food cards
  const {
    state: tripState,
    messages: tripMessages,
    contextSummary,
    pendingConflict,
    acceptingId,
    sendMessage: sendTripMessage,
    acceptSuggestion,
    overrideConflict,
    dismissConflict,
    injectMessage,
  } = useDuringTripChat({ tripId, location, demoTime });

  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());

  // Itinerary edit agent — handles text input (AI decides: assist or edit)
  const chatAgent = useChatAgent({
    tripId,
    location,
    onItineraryUpdated,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef<number | null>(null);

  // Inject initial suggestions from AiTripAssistant
  useEffect(() => {
    const ts = initialSuggestions?._ts ?? 0;
    if (
      initialSuggestions?.suggestions?.length &&
      injectedRef.current !== ts
    ) {
      injectedRef.current = ts;
      const cards: ChatCard[] = initialSuggestions.suggestions.map((s) => ({
        type: 'suggestion' as const,
        data: s,
      }));
      injectMessage({
        role: 'assistant',
        text: initialSuggestions.contextSummary || 'Here are some suggestions for you:',
        cards,
        timestamp: Date.now(),
      });
    }
  }, [initialSuggestions, injectMessage]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [tripMessages, tripState, chatAgent.messages, chatAgent.status]);

  const isTripSending = tripState === 'sending';
  const isAgentStreaming = chatAgent.status === 'streaming';

  const handleAcceptSuggestion = useCallback(
    async (data: SuggestionCardData) => {
      const result = await acceptSuggestion(data, getTimeOfDay(demoTime), data.time_required_minutes || 60, currentDayNumber);
      if (result.success) {
        setAcceptedIds(prev => new Set(prev).add(data.id));
        onItineraryUpdated?.();
      }
    },
    [acceptSuggestion, demoTime, currentDayNumber, onItineraryUpdated],
  );

  const handleAcceptFood = useCallback(
    async (data: FoodCardData) => {
      const result = await acceptSuggestion(data, getTimeOfDay(demoTime), 60, currentDayNumber);
      if (result.success) {
        setAcceptedIds(prev => new Set(prev).add(data.id));
        onItineraryUpdated?.();
      }
    },
    [acceptSuggestion, demoTime, currentDayNumber, onItineraryUpdated],
  );

  const handleDirections = useCallback(
    (coords: { lat: number; lng: number }, name: string) => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&destination_place_id=${encodeURIComponent(name)}`;
      window.open(url, '_blank');
    },
    [],
  );

  // Text input sends to itinerary agent (AI routes to assist or edit based on intent)
  const handleSendText = useCallback(
    (text: string) => {
      chatAgent.sendMessageText(text);
    },
    [chatAgent],
  );

  const isSending = isTripSending || isAgentStreaming;
  const hasAgentMessages = chatAgent.messages.length > 1;
  const hasTripMessages = tripMessages.length > 0;
  const showEmpty = !hasAgentMessages && !hasTripMessages;
  const currentTimeOfDay = getTimeOfDay(demoTime);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-sm">AI Assistant</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {showEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Sparkles className="w-10 h-10 text-primary/30 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              {contextSummary || 'Your AI trip assistant'}
            </p>
            <p className="text-xs text-muted-foreground">
              Ask me anything — restaurants, directions, local tips, what to do next, or edit your itinerary.
            </p>
          </div>
        )}

        {/* Itinerary agent messages (welcome + conversation) */}
        {chatAgent.messages.map((msg: ChatMessage) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Trip assistant messages (quick actions, suggestion cards) */}
        {tripMessages.map((msg) => (
          <TripChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.text}
            cards={msg.cards}
            onAcceptSuggestion={handleAcceptSuggestion}
            onAcceptFood={handleAcceptFood}
            onDirections={handleDirections}
            acceptingId={acceptingId}
            acceptedIds={acceptedIds}
            timeOfDay={currentTimeOfDay}
          />
        ))}

        {/* Trip assistant sending indicator */}
        {isTripSending && (
          <TripChatMessage role="assistant" content="" isStreaming />
        )}
      </div>

      {/* Conflict resolution banner */}
      {pendingConflict && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-amber-950 text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Schedule conflict — add anyway?</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={overrideConflict}
              className="flex-1 px-2 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-amber-50 text-xs font-medium transition-colors"
            >
              Force add
            </button>
            <button
              type="button"
              onClick={dismissConflict}
              className="flex-1 px-2 py-1.5 rounded bg-amber-900 hover:bg-amber-800 text-amber-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending itinerary changes preview */}
      {chatAgent.pendingChanges.length > 0 && (
        <ChangesPreview
          changes={chatAgent.pendingChanges}
          onConfirm={chatAgent.confirmChanges}
          onReject={chatAgent.rejectChanges}
        />
      )}

      {/* Error banner */}
      {chatAgent.error && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-red-950 text-red-300 text-xs flex items-center justify-between gap-2">
          <span>{chatAgent.error}</span>
          <button
            type="button"
            onClick={chatAgent.clearError}
            className="shrink-0 text-red-400 hover:text-red-200 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick actions (trip assistant) */}
      <QuickActions onAction={sendTripMessage} disabled={isSending} />

      {/* Input — routes to itinerary agent */}
      <ChatInput
        onSendText={handleSendText}
        isSending={isSending}
      />
    </div>
  );
}
