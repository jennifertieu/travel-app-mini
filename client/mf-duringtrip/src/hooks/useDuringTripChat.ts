import { useState, useCallback, useRef } from 'react';
import {
  sendChatMessage,
  acceptSuggestion as acceptSuggestionApi,
  updateActivityStatus as updateActivityStatusApi,
  type ChatCard,
  type SuggestionCardData,
  type FoodCardData,
  type AcceptSuggestionResponse,
} from '../services/duringTripService';

export type ChatState = 'idle' | 'sending';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: ChatCard[];
  timestamp: number;
}

export interface PendingConflict {
  suggestion: SuggestionCardData | FoodCardData;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayNumber?: number;
  durationMinutes: number;
  response: AcceptSuggestionResponse;
}

interface UseDuringTripChatOptions {
  tripId: string;
  location?: { lat: number; lng: number; accuracy_meters?: number } | null;
  demoTime?: Date | null;
}

export function useDuringTripChat({ tripId, location, demoTime }: UseDuringTripChatOptions) {
  const [state, setState] = useState<ChatState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [contextSummary, setContextSummary] = useState<string | null>(null);
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const idCounter = useRef(0);

  const nextId = () => {
    idCounter.current += 1;
    return `msg-${idCounter.current}`;
  };

  const locationPayload = location
    ? { lat: location.lat, lng: location.lng, accuracy_meters: location.accuracy_meters }
    : undefined;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || state === 'sending' || !tripId) return;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setState('sending');
    setError(null);

    try {
      const response = await sendChatMessage(tripId, text.trim(), locationPayload, demoTime);

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        text: response.text,
        cards: response.cards,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (response.context_summary) {
        setContextSummary(response.context_summary);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);

      const errorMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        text: "Sorry, I couldn't process that. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setState('idle');
    }
  }, [state, tripId, locationPayload, demoTime]);

  const handleAcceptSuggestion = useCallback(async (
    card: SuggestionCardData | FoodCardData,
    timeOfDay: 'morning' | 'afternoon' | 'evening',
    durationMinutes: number,
    dayNumber?: number,
  ): Promise<AcceptSuggestionResponse> => {
    const cardId = card.id;
    setAcceptingId(cardId);
    try {
      const result = await acceptSuggestionApi({
        tripId,
        suggestion: card,
        timeOfDay,
        durationMinutes,
        dayNumber,
        currentTime: demoTime,
      });

      if (result.success) {
        const name = 'title' in card ? card.title : (card as FoodCardData).name;
        const confirmMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          text: `Added "${name}" to your ${timeOfDay} itinerary!`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, confirmMsg]);
      } else if (result.conflicts_detected) {
        setPendingConflict({ suggestion: card, timeOfDay, dayNumber, durationMinutes, response: result });
        const desc = result.conflicts?.map(c => c.description).join('; ') ?? 'Schedule conflict detected';
        const conflictMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          text: `⚠️ ${desc}. You can force-add it or cancel.`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, conflictMsg]);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add activity';
      setError(message);
      throw err;
    } finally {
      setAcceptingId(null);
    }
  }, [tripId, demoTime]);

  const overrideConflict = useCallback(async () => {
    if (!pendingConflict) return;
    const { suggestion, timeOfDay, dayNumber, durationMinutes } = pendingConflict;
    setPendingConflict(null);
    setAcceptingId(suggestion.id);
    try {
      const result = await acceptSuggestionApi({
        tripId,
        suggestion,
        timeOfDay,
        durationMinutes,
        dayNumber,
        overrideConflicts: true,
        currentTime: demoTime,
      });
      if (result.success) {
        const name = 'title' in suggestion ? suggestion.title : (suggestion as FoodCardData).name;
        const msg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          text: `Added "${name}" to your ${timeOfDay} itinerary (conflicts overridden).`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, msg]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add activity';
      setError(message);
    } finally {
      setAcceptingId(null);
    }
  }, [pendingConflict, tripId, demoTime]);

  const dismissConflict = useCallback(() => {
    setPendingConflict(null);
  }, []);

  const handleUpdateActivity = useCallback(async (
    activityId: string,
    status: 'scheduled' | 'in_progress' | 'completed' | 'skipped'
  ) => {
    try {
      await updateActivityStatusApi(tripId, activityId, status);

      const statusLabels: Record<string, string> = {
        in_progress: 'started',
        completed: 'completed',
        skipped: 'skipped',
      };

      const confirmMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        text: `Activity ${statusLabels[status] || 'updated'}!`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, confirmMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update activity';
      setError(message);
    }
  }, [tripId]);

  const clearError = useCallback(() => setError(null), []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setContextSummary(null);
  }, []);

  const injectMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: nextId() }]);
    if ('cards' in msg && msg.text) {
      setContextSummary(msg.text);
    }
  }, []);

  return {
    state,
    messages,
    error,
    contextSummary,
    pendingConflict,
    acceptingId,
    sendMessage,
    acceptSuggestion: handleAcceptSuggestion,
    overrideConflict,
    dismissConflict,
    updateActivity: handleUpdateActivity,
    clearError,
    clearMessages,
    injectMessage,
  };
}
