import React from 'react';
import { VoiceAssistantProvider } from '../../contexts/VoiceAssistantContext';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { VoiceAssistantButton } from './VoiceAssistantButton';
import { VoiceAssistantPanel } from './VoiceAssistantPanel';
import type { TripContext } from '../../types/voice';

interface VoiceAssistantProps {
  tripContext?: TripContext;
}

// Inner component that uses the context
function VoiceAssistantContent() {
  const {
    state,
    isExpanded,
    error,
    transcript,
    conversationHistory,
    isTranscriptVisible,
    tripContext,
    expand,
    collapse,
    clearConversation,
    startListening,
    stopListening,
    toggleTranscript,
  } = useVoiceAssistant();

  return (
    <>
      {/* Floating button */}
      <VoiceAssistantButton
        onClick={expand}
        isExpanded={isExpanded}
      />

      {/* Expanded panel */}
      <VoiceAssistantPanel
        isOpen={isExpanded}
        state={state}
        transcript={transcript}
        conversationHistory={conversationHistory}
        isTranscriptVisible={isTranscriptVisible}
        tripContext={tripContext}
        error={error}
        onClose={collapse}
        onStartListening={startListening}
        onStopListening={stopListening}
        onToggleTranscript={toggleTranscript}
        onClearConversation={clearConversation}
      />
    </>
  );
}

// Main component with provider
export function VoiceAssistant({ tripContext }: VoiceAssistantProps) {
  return (
    <VoiceAssistantProvider initialTripContext={tripContext}>
      <VoiceAssistantContent />
    </VoiceAssistantProvider>
  );
}
