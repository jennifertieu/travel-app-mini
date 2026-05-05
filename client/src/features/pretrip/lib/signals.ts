import { Flame, ThumbsUp, Minus, SkipForward } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SignalType = "fire" | "down" | "meh" | "skip";

export interface SignalConfig {
  signal: SignalType;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

export const SIGNAL_CONFIG: SignalConfig[] = [
  {
    signal: "fire",
    label: "Must do!",
    icon: Flame,
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  {
    signal: "down",
    label: "Interested",
    icon: ThumbsUp,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    signal: "meh",
    label: "Meh",
    icon: Minus,
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
  {
    signal: "skip",
    label: "Skip",
    icon: SkipForward,
    color: "text-muted-foreground",
    bg: "bg-red-50",
    border: "border-red-200",
  },
];

// Category-aware labels — same signals, friendlier wording for hotels
const STAY_LABELS: Record<SignalType, string> = {
  fire: "Love it!",
  down: "Maybe",
  meh: "Meh",
  skip: "Pass",
};

/** Get the display label for a signal, optionally adjusted for the idea's category */
export function getSignalLabel(
  signal: SignalType,
  category?: string | null,
): string {
  if (category && category.toLowerCase() === "stay") {
    return STAY_LABELS[signal];
  }
  return SIGNAL_CONFIG.find((s) => s.signal === signal)?.label ?? signal;
}
