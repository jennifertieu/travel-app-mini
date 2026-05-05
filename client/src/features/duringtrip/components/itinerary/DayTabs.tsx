import { cn, formatDayDate } from "../../lib/utils";
import type { ItineraryDay } from "../../types/itinerary";

interface DayTabsProps {
  days: ItineraryDay[];
  activeDay: number;
  currentDayNumber?: number;
  onSelectDay: (day: number) => void;
}

export function DayTabs({ days, activeDay, currentDayNumber, onSelectDay }: DayTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
      {days.map((d, i) => {
        const isToday = currentDayNumber != null && d.day_number === currentDayNumber;
        const isPast = currentDayNumber != null && d.day_number < currentDayNumber;
        const isActive = d.day_number === activeDay;

        return (
          <button
            key={`day-${d.day_number}-${i}`}
            type="button"
            onClick={() => onSelectDay(d.day_number)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors relative",
              isActive
                ? "bg-teal-600 text-white"
                : isPast
                  ? "bg-muted/60 text-muted-foreground/60 hover:bg-muted/80"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            Day {d.day_number}
            {d.date && (
              <span className="ml-1.5 text-xs opacity-75">
                {formatDayDate(d.date)}
              </span>
            )}
            {isToday && (
              <span
                className={cn(
                  "ml-1.5 text-[10px] font-bold uppercase",
                  isActive ? "text-teal-100" : "text-teal-600",
                )}
              >
                Today
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
