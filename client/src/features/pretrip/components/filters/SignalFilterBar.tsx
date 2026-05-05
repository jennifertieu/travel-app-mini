import { Sparkles } from "lucide-react";
import { SIGNAL_CONFIG } from "../../lib/signals";

interface SignalFilterBarProps {
  activeSignal: string | null;
  onSignalChange: (signal: string | null) => void;
  counts: Record<string, number>;
}

export function SignalFilterBar({
  activeSignal,
  onSignalChange,
  counts,
}: SignalFilterBarProps) {
  const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
      {/* All chip */}
      <button
        type="button"
        onClick={() => onSignalChange(null)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ease-out shrink-0 ${
          activeSignal === null
            ? "bg-[#13BFB0] text-white border-[#13BFB0] scale-[1.02]"
            : "bg-muted text-foreground border-transparent hover:border-border hover:bg-muted/80"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>All</span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            activeSignal === null ? "bg-white/20" : "bg-background/80"
          }`}
        >
          {totalCount}
        </span>
      </button>

      {SIGNAL_CONFIG.map(({ signal, label, icon: Icon }) => {
        const count = counts[signal] || 0;
        if (count === 0) return null;
        const isActive = activeSignal === signal;

        return (
          <button
            key={signal}
            type="button"
            onClick={() => onSignalChange(signal)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ease-out shrink-0 ${
              isActive
                ? "bg-[#13BFB0] text-white border-[#13BFB0] scale-[1.02]"
                : "bg-muted text-foreground border-transparent hover:border-border hover:bg-muted/80"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive ? "bg-white/20" : "bg-background/80"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
