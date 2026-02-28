import React from 'react';
import { Compass, UtensilsCrossed, CalendarCheck, Sparkles } from 'lucide-react';

interface QuickActionsProps {
  onAction: (message: string) => void;
  disabled?: boolean;
}

const ACTIONS = [
  { label: 'What now?', message: 'What should I do right now?', icon: Compass },
  { label: 'Find food', message: "I'm looking for somewhere to eat nearby", icon: UtensilsCrossed },
  { label: "What's next?", message: "What's my next scheduled activity?", icon: CalendarCheck },
  { label: 'Surprise me', message: 'Suggest something fun and spontaneous nearby', icon: Sparkles },
];

export function QuickActions({ onAction, disabled }: QuickActionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 py-2">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={() => onAction(action.message)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-xs font-medium text-foreground whitespace-nowrap hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <action.icon className="w-3.5 h-3.5 text-primary" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
