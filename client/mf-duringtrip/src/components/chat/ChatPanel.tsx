import React, { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  onClose?: () => void;
  className?: string;
}

export function ChatPanel({ onClose, className }: ChatPanelProps) {
  const {
    state,
    transcript,
    conversationHistory,
    startListening,
    stopListening,
    sendTextMessage,
    expand,
  } = useVoiceAssistant();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-expand on mount so the connection is established
  useEffect(() => {
    expand();
  }, [expand]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [conversationHistory, transcript]);

  const isProcessing = state === 'processing' || state === 'streaming';
  const isListening = state === 'listening';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-sm">AI Assistant</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationHistory.length === 0 && !transcript && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Sparkles className="w-10 h-10 text-primary/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Ask me anything about your trip — restaurants, directions, local tips, and more.
            </p>
          </div>
        )}

        {conversationHistory.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}

        {/* Streaming assistant response */}
        {transcript && (
          <ChatMessage role="assistant" content={transcript} isStreaming />
        )}

        {/* Processing indicator (no transcript yet) */}
        {isProcessing && !transcript && (
          <ChatMessage role="assistant" content="" isStreaming />
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSendText={sendTextMessage}
        onStartVoice={startListening}
        onStopVoice={stopListening}
        isListening={isListening}
        isSending={isProcessing}
      />
    </div>
  );
}
