import { cn, formatDayDate } from "../lib/utils";
import type { ItineraryDay } from "../types";

export interface DayTabsProps {
  days: ItineraryDay[];
  activeDayIndex: number;
  onSelectDay: (index: number) => void;
}

export function DayTabs({ days, activeDayIndex, onSelectDay }: DayTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
      {days.map((d, i) => (
        <button
          key={`day-${d.day}-${i}`}
          type="button"
          onClick={() => onSelectDay(i)}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            i === activeDayIndex
              ? "bg-teal-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          Day{d.day ? ` ${d.day}` : ""}
          {d.date && (
            <span className="ml-1.5 text-xs opacity-75">
              {formatDayDate(d.date)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
