import React from 'react';
import { cn } from '../../lib/utils';
import { AssistantAvatar } from './AssistantAvatar';

interface VoiceAssistantButtonProps {
  onClick: () => void;
  isExpanded: boolean;
  className?: string;
}

export function VoiceAssistantButton({
  onClick,
  isExpanded,
  className,
}: VoiceAssistantButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open voice assistant"
      aria-expanded={isExpanded}
      className={cn(
        // Position & layout
        'fixed z-50',
        'bottom-6 left-1/2 -translate-x-1/2', // Bottom center
        'mb-safe', // Safe area for iOS
        // Size
        'w-18 h-18', // 72px (18 * 4)
        // Visual
        'rounded-full',
        'shadow-lg hover:shadow-xl',
        'bg-transparent',
        // Transitions
        'transition-all duration-300 ease-out',
        'hover:scale-105',
        'active:scale-95',
        // Focus
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50',
        // Hide when expanded
        isExpanded && 'opacity-0 pointer-events-none scale-75',
        className
      )}
      style={{ width: 72, height: 72 }}
    >
      <AssistantAvatar state="idle" size="sm" />
    </button>
  );
}
