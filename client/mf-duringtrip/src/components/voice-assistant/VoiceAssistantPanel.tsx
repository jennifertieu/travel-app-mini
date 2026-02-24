import React from 'react';
import { X, MessageSquareText, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { AssistantAvatar } from './AssistantAvatar';
import { PushToTalkButton } from './PushToTalkButton';
import { TranscriptDisplay } from './TranscriptDisplay';
import { StatusPrompt } from './StatusPrompt';
import type { VoiceState, TripContext, ConversationMessage } from '../../types/voice';

interface VoiceAssistantPanelProps {
  isOpen: boolean;
  state: VoiceState;
  transcript: string;
  conversationHistory: ConversationMessage[];
  isTranscriptVisible: boolean;
  tripContext?: TripContext | null;
  error?: string | null;
  onClose: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onToggleTranscript: () => void;
  onClearConversation: () => void;
  className?: string;
}

export function VoiceAssistantPanel({
  isOpen,
  state,
  transcript,
  conversationHistory,
  isTranscriptVisible,
  tripContext,
  error,
  onClose,
  onStartListening,
  onStopListening,
  onToggleTranscript,
  onClearConversation,
  className,
}: VoiceAssistantPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-sm',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Voice Assistant"
        className={cn(
          // Position
          'fixed z-50',
          'inset-x-0 bottom-0',
          'sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md sm:w-full',
          // Visual
          'bg-card border-t sm:border sm:rounded-2xl',
          'shadow-2xl',
          // Safe area
          'pb-safe',
          // Transform animation
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">
            Travel Assistant
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close voice assistant"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center p-6 gap-6">
          {/* Avatar */}
          <AssistantAvatar state={state} size="lg" />

          {/* Status prompt */}
          <StatusPrompt
            state={state}
            tripContext={tripContext}
            error={error}
          />

          {/* Transcript */}
          <TranscriptDisplay
            transcript={transcript}
            conversationHistory={conversationHistory}
            isVisible={isTranscriptVisible}
          />

          {/* Push to talk button */}
          <PushToTalkButton
            state={state}
            onStart={onStartListening}
            onEnd={onStopListening}
          />

          {/* Transcript controls */}
          <div className="flex items-center justify-center gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTranscript}
              className="text-muted-foreground"
            >
              <MessageSquareText className="w-4 h-4 mr-2" />
              {isTranscriptVisible ? 'Hide' : 'Show'} transcript
            </Button>
            {conversationHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearConversation}
                className="text-muted-foreground"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
