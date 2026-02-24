import React from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePushToTalk } from '../../hooks/usePushToTalk';
import type { VoiceState } from '../../types/voice';

interface PushToTalkButtonProps {
  state: VoiceState;
  onStart: () => void;
  onEnd: () => void;
  className?: string;
}

export function PushToTalkButton({
  state,
  onStart,
  onEnd,
  className,
}: PushToTalkButtonProps) {
  const isDisabled = state === 'processing';
  const isActive = state === 'listening';

  const { isPressed, handlers } = usePushToTalk({
    onStart,
    onEnd,
    disabled: isDisabled,
    minHoldTime: 500,
  });

  // Determine button appearance based on state
  const getButtonContent = () => {
    switch (state) {
      case 'listening':
        return (
          <>
            <Mic className="w-8 h-8 animate-pulse" />
            <span className="sr-only">Release to send</span>
          </>
        );
      case 'processing':
        return (
          <>
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="sr-only">Processing</span>
          </>
        );
      case 'streaming':
      case 'speaking':
        return (
          <>
            <Mic className="w-8 h-8" />
            <span className="text-xs mt-1 font-medium">Tap to interrupt</span>
          </>
        );
      default:
        return (
          <>
            <Mic className="w-8 h-8" />
            <span className="text-xs mt-1 font-medium">Hold to speak</span>
          </>
        );
    }
  };

  return (
    <button
      {...handlers}
      disabled={isDisabled}
      aria-label={
        state === 'listening'
          ? 'Release to send your message'
          : state === 'processing'
          ? 'Processing your message'
          : 'Hold to speak'
      }
      aria-pressed={isPressed}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        // Base styles
        'flex flex-col items-center justify-center',
        'w-24 h-24', // 96px
        'rounded-full',
        'touch-none select-none',
        'transition-all duration-150 ease-out',
        // Focus styles
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50',
        // State-based styles
        state === 'idle' && [
          'bg-muted',
          'border-2 border-dashed border-muted-foreground/30',
          'text-muted-foreground',
          'hover:bg-muted/80 hover:border-muted-foreground/50',
        ],
        state === 'listening' && [
          'bg-primary',
          'text-primary-foreground',
          'scale-110',
          'shadow-lg shadow-primary/30',
          'ring-4 ring-primary/30',
        ],
        state === 'processing' && [
          'bg-secondary',
          'text-secondary-foreground',
          'cursor-wait',
        ],
        (state === 'streaming' || state === 'speaking') && [
          'bg-primary/80',
          'text-primary-foreground',
          'hover:bg-primary/90',
        ],
        state === 'interrupted' && [
          'bg-amber-500',
          'text-white',
        ],
        // Disabled
        isDisabled && 'opacity-70 cursor-not-allowed',
        className
      )}
    >
      {getButtonContent()}
    </button>
  );
}
