import React, { useEffect } from 'react';
import { VoiceAssistantProvider } from '../../contexts/VoiceAssistantContext';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { VoiceAssistantButton } from './VoiceAssistantButton';
import { VoiceAssistantPanel } from './VoiceAssistantPanel';
import type { TripContext } from '../../types/voice';

interface VoiceAssistantProps {
  tripContext?: TripContext;
  /** When true, auto-expand the panel (used by mobile tab bar) */
  autoExpand?: boolean;
  /** Hide the floating button (mobile uses tab bar instead) */
  hideButton?: boolean;
}

// Inner component that uses the context
function VoiceAssistantContent({ autoExpand, hideButton }: { autoExpand?: boolean; hideButton?: boolean }) {
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

  useEffect(() => {
    if (autoExpand) {
      expand();
    } else if (autoExpand === false && isExpanded) {
      collapse();
    }
  }, [autoExpand]);

  return (
    <>
      {/* Floating button */}
      {!hideButton && (
        <VoiceAssistantButton
          onClick={expand}
          isExpanded={isExpanded}
        />
      )}

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
export function VoiceAssistant({ tripContext, autoExpand, hideButton }: VoiceAssistantProps) {
  return (
    <VoiceAssistantProvider initialTripContext={tripContext}>
      <VoiceAssistantContent autoExpand={autoExpand} hideButton={hideButton} />
    </VoiceAssistantProvider>
  );
}
