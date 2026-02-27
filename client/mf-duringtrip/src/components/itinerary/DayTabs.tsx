import { cn, formatDayDate } from "../../lib/utils";
import type { ItineraryDay } from "../../types/itinerary";

interface DayTabsProps {
  days: ItineraryDay[];
  activeDay: number;
  onSelectDay: (day: number) => void;
}

export function DayTabs({ days, activeDay, onSelectDay }: DayTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
      {days.map((d, i) => (
        <button
          key={`day-${d.day}-${i}`}
          type="button"
          onClick={() => onSelectDay(d.day)}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            d.day === activeDay
              ? "bg-teal-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          Day {d.day}
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
