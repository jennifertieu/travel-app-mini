import React from 'react';
import { cn } from '../../lib/utils';
import { AssistantAvatar } from '../voice-assistant/AssistantAvatar';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  if (role === 'assistant') {
    return (
      <div className="flex items-start gap-2 max-w-[85%]">
        <AssistantAvatar state={isStreaming ? 'streaming' : 'idle'} size="sm" className="shrink-0 mt-1" />
        <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
          {content}
          {isStreaming && !content && <StreamingDots />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 text-sm max-w-[85%]">
        {content}
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
