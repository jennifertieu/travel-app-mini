import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatInputProps {
  onSendText: (text: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  isListening: boolean;
  isSending: boolean;
}

export function ChatInput({
  onSendText,
  onStartVoice,
  onStopVoice,
  isListening,
  isSending,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    onSendText(trimmed);
    setText('');
    inputRef.current?.focus();
  }, [text, isSending, onSendText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleMicPress = useCallback(() => {
    if (isListening) {
      onStopVoice();
    } else {
      onStartVoice();
    }
  }, [isListening, onStartVoice, onStopVoice]);

  return (
    <div className="flex items-center gap-2 p-3 border-t bg-background">
      <button
        type="button"
        onClick={handleMicPress}
        aria-label={isListening ? 'Stop recording' : 'Start recording'}
        className={cn(
          'shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors',
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What would you like to know?"
        disabled={isSending}
        className="flex-1 min-w-0 bg-muted rounded-full px-4 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={!text.trim() || isSending}
        aria-label="Send message"
        className={cn(
          'shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors',
          text.trim() && !isSending
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground/40'
        )}
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
