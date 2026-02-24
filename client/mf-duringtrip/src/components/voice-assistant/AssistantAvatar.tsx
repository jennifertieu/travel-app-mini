import React from 'react';
import { cn } from '../../lib/utils';
import type { VoiceState, AvatarExpression } from '../../types/voice';

interface AssistantAvatarProps {
  state: VoiceState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Map voice state to avatar expression
function getExpression(state: VoiceState): AvatarExpression {
  switch (state) {
    case 'listening':
      return 'listening';
    case 'processing':
      return 'thinking';
    case 'streaming':
    case 'speaking':
      return 'speaking';
    case 'interrupted':
      return 'confused';
    default:
      return 'idle';
  }
}

export function AssistantAvatar({ state, size = 'md', className }: AssistantAvatarProps) {
  const expression = getExpression(state);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      {/* Outer glow ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          'transition-all duration-300',
          expression === 'idle' && 'bg-primary/10 animate-pulse',
          expression === 'listening' && 'bg-primary/20 animate-ping',
          expression === 'thinking' && 'bg-secondary/20',
          expression === 'speaking' && 'bg-primary/30 animate-pulse',
          expression === 'confused' && 'bg-amber-500/20'
        )}
      />

      {/* Main orb body */}
      <div
        className={cn(
          'relative z-10 rounded-full flex items-center justify-center',
          'transition-all duration-300 ease-out',
          size === 'sm' && 'w-10 h-10',
          size === 'md' && 'w-20 h-20',
          size === 'lg' && 'w-28 h-28',
          // Background based on expression
          expression === 'idle' && 'bg-gradient-to-br from-primary to-primary/80',
          expression === 'listening' && 'bg-gradient-to-br from-primary to-purple-600 scale-110',
          expression === 'thinking' && 'bg-gradient-to-br from-secondary to-secondary/80',
          expression === 'speaking' && 'bg-gradient-to-br from-primary to-blue-600',
          expression === 'confused' && 'bg-gradient-to-br from-amber-500 to-amber-600',
          // Animation based on expression
          expression === 'idle' && 'animate-bounce-gentle',
          expression === 'speaking' && 'animate-bounce-talk'
        )}
      >
        {/* Face */}
        <div className="flex flex-col items-center justify-center">
          {/* Eyes */}
          <div className="flex gap-2 mb-1">
            <Eye expression={expression} size={size} />
            <Eye expression={expression} size={size} />
          </div>

          {/* Mouth */}
          <Mouth expression={expression} size={size} />
        </div>
      </div>

      {/* Sound waves for listening/speaking */}
      {(expression === 'listening' || expression === 'speaking') && (
        <SoundWaves expression={expression} size={size} />
      )}

      {/* Thinking dots */}
      {expression === 'thinking' && <ThinkingDots size={size} />}
    </div>
  );
}

// Eye component
function Eye({
  expression,
  size,
}: {
  expression: AvatarExpression;
  size: 'sm' | 'md' | 'lg';
}) {
  const eyeSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-white transition-all duration-200',
        eyeSize[size],
        expression === 'listening' && 'scale-125',
        expression === 'speaking' && 'animate-blink',
        expression === 'thinking' && 'animate-look-around',
        expression === 'confused' && 'scale-110'
      )}
    />
  );
}

// Mouth component
function Mouth({
  expression,
  size,
}: {
  expression: AvatarExpression;
  size: 'sm' | 'md' | 'lg';
}) {
  const mouthSize = {
    sm: { width: 6, height: 3 },
    md: { width: 12, height: 6 },
    lg: { width: 16, height: 8 },
  };

  const { width, height } = mouthSize[size];

  if (expression === 'speaking') {
    return (
      <div
        className="bg-white rounded-full animate-mouth-talk"
        style={{ width, height }}
      />
    );
  }

  if (expression === 'listening') {
    return (
      <div
        className="bg-white rounded-full"
        style={{ width: width * 0.5, height: height * 0.5 }}
      />
    );
  }

  if (expression === 'confused') {
    return (
      <div
        className="bg-white rounded-sm"
        style={{ width: width * 0.6, height: height * 0.3 }}
      />
    );
  }

  // Default smile
  return (
    <div
      className="border-b-2 border-white rounded-b-full"
      style={{ width, height: height * 0.5 }}
    />
  );
}

// Sound waves animation
function SoundWaves({
  expression,
  size,
}: {
  expression: AvatarExpression;
  size: 'sm' | 'md' | 'lg';
}) {
  const offset = {
    sm: 28,
    md: 56,
    lg: 72,
  };

  return (
    <>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'absolute rounded-full border-2',
            expression === 'listening' ? 'border-primary/40' : 'border-primary/30',
            'animate-sound-wave'
          )}
          style={{
            width: offset[size] + i * 16,
            height: offset[size] + i * 16,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </>
  );
}

// Thinking dots animation
function ThinkingDots({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const dotSize = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const position = {
    sm: 'top-0 right-0',
    md: 'top-2 right-2',
    lg: 'top-4 right-4',
  };

  return (
    <div className={cn('absolute flex gap-1', position[size])}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full bg-secondary-foreground/60 animate-bounce',
            dotSize[size]
          )}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
