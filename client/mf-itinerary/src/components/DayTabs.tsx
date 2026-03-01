import { Wallet, Plane } from "lucide-react";
import { cn, formatDayDate } from "../lib/utils";
import type { ItineraryDay } from "../types";

export interface DayTabsProps {
  days: ItineraryDay[];
  activeDayIndex: number;
  budgetTabActive?: boolean;
  travelTabActive?: boolean;
  guideTabActive?: boolean;
  hasFlights?: boolean;
  onSelectDay: (index: number) => void;
  onSelectBudget?: () => void;
  onSelectTravel?: () => void;
  onSelectGuide?: () => void;
}

export function DayTabs({
  days,
  activeDayIndex,
  budgetTabActive,
  travelTabActive,
  guideTabActive,
  hasFlights,
  onSelectDay,
  onSelectBudget,
  onSelectTravel,
  onSelectGuide,
}: DayTabsProps) {
  const noSpecialTab = !budgetTabActive && !travelTabActive && !guideTabActive;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
      {days.map((d, i) => (
        <button
          key={`day-${d.day}-${i}`}
          type="button"
          onClick={() => onSelectDay(i)}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            noSpecialTab && i === activeDayIndex
              ? "bg-teal-600 text-white"
              : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700",
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
      {onSelectTravel && (
        <button
          type="button"
          onClick={onSelectTravel}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            travelTabActive
              ? "bg-teal-600 text-white"
              : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700",
          )}
        >
          <Plane className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
          Travel
        </button>
      )}
      {onSelectBudget && (
        <button
          type="button"
          onClick={onSelectBudget}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            budgetTabActive
              ? "bg-teal-600 text-white"
              : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700",
          )}
        >
          <Wallet className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
          Budget
        </button>
      )}
      {onSelectGuide && (
        <button
          type="button"
          onClick={onSelectGuide}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            guideTabActive
              ? "bg-teal-600 text-white"
              : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700",
          )}
        >
          📖 Guide
        </button>
      )}
    </div>
  );
}
