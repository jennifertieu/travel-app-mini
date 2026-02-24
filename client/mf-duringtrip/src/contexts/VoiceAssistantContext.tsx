import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { VoiceState, TripContext } from '../types/voice';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface VoiceAssistantContextValue {
  // State
  state: VoiceState;
  isExpanded: boolean;
  error: string | null;
  transcript: string;
  conversationHistory: ConversationMessage[];
  isTranscriptVisible: boolean;
  tripContext: TripContext | null;

  // State setters (for hooks to update)
  setState: (state: VoiceState) => void;
  setError: (error: string | null) => void;
  setTranscript: (transcript: string) => void;
  appendTranscript: (chunk: string) => void;
  finalizeAssistantMessage: () => void;
  addUserMessage: (content: string) => void;
  clearConversation: () => void;

  // UI actions
  expand: () => void;
  collapse: () => void;
  toggleTranscript: () => void;
  clearError: () => void;
  setTripContext: (context: TripContext | null) => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | undefined>(undefined);

interface VoiceAssistantProviderProps {
  children: ReactNode;
  initialTripContext?: TripContext;
}

export function VoiceAssistantProvider({
  children,
  initialTripContext,
}: VoiceAssistantProviderProps) {
  const [state, setStateInternal] = useState<VoiceState>('idle');
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
  const [tripContext, setTripContext] = useState<TripContext | null>(initialTripContext || null);

  const setState = useCallback((newState: VoiceState) => {
    setStateInternal(newState);
    // Clear current transcript when returning to idle (but keep history)
    if (newState === 'idle') {
      setTranscript('');
    }
  }, []);

  const appendTranscript = useCallback((chunk: string) => {
    setTranscript((prev) => prev + chunk);
  }, []);

  // Finalize the current assistant message and add to history
  const finalizeAssistantMessage = useCallback(() => {
    setTranscript((currentTranscript) => {
      if (currentTranscript.trim()) {
        setConversationHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: currentTranscript.trim(),
            timestamp: Date.now(),
          },
        ]);
      }
      return ''; // Clear current transcript
    });
  }, []);

  // Add a user message to history
  const addUserMessage = useCallback((content: string) => {
    if (content.trim()) {
      setConversationHistory((prev) => [
        ...prev,
        {
          role: 'user',
          content: content.trim(),
          timestamp: Date.now(),
        },
      ]);
    }
  }, []);

  // Clear all conversation history
  const clearConversation = useCallback(() => {
    setConversationHistory([]);
    setTranscript('');
  }, []);

  const expand = useCallback(() => {
    setIsExpanded(true);
    setError(null);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
    setStateInternal('idle');
    setTranscript('');
    // Keep conversation history when collapsing - user can clear manually
    setError(null);
  }, []);

  const toggleTranscript = useCallback(() => {
    setIsTranscriptVisible((prev) => !prev);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: VoiceAssistantContextValue = {
    state,
    isExpanded,
    error,
    transcript,
    conversationHistory,
    isTranscriptVisible,
    tripContext,
    setState,
    setError,
    setTranscript,
    appendTranscript,
    finalizeAssistantMessage,
    addUserMessage,
    clearConversation,
    expand,
    collapse,
    toggleTranscript,
    clearError,
    setTripContext,
  };

  return (
    <VoiceAssistantContext.Provider value={value}>
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistantContext() {
  const context = useContext(VoiceAssistantContext);
  if (context === undefined) {
    throw new Error('useVoiceAssistantContext must be used within a VoiceAssistantProvider');
  }
  return context;
}
