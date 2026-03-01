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

interface UseDuringTripChatOptions {
  tripId: string;
  location?: { lat: number; lng: number; accuracy_meters?: number } | null;
}

export function useDuringTripChat({ tripId, location }: UseDuringTripChatOptions) {
  const [state, setState] = useState<ChatState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [contextSummary, setContextSummary] = useState<string | null>(null);
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
      const response = await sendChatMessage(tripId, text.trim(), locationPayload);

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
  }, [state, tripId, locationPayload]);

  const handleAcceptSuggestion = useCallback(async (
    card: SuggestionCardData | FoodCardData,
    timeOfDay: 'morning' | 'afternoon' | 'evening',
    durationMinutes: number
  ): Promise<AcceptSuggestionResponse> => {
    const result = await acceptSuggestionApi(tripId, card, timeOfDay, durationMinutes);

    if (result.success) {
      const name = 'title' in card ? card.title : (card as FoodCardData).name;
      const confirmMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        text: `Added "${name}" to your itinerary!`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, confirmMsg]);
    }

    return result;
  }, [tripId]);

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
    sendMessage,
    acceptSuggestion: handleAcceptSuggestion,
    updateActivity: handleUpdateActivity,
    clearError,
    clearMessages,
    injectMessage,
  };
}
