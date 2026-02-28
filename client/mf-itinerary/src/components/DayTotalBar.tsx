import { Ticket, Car, UtensilsCrossed } from "lucide-react";

interface DayTotalBarProps {
  activityTotal: number;
  transportTotal: number;
  foodTotal: number;
}

export function DayTotalBar({
  activityTotal,
  transportTotal,
  foodTotal,
}: DayTotalBarProps) {
  if (activityTotal === 0 && transportTotal === 0 && foodTotal === 0) {
    return null;
  }

  const dayTotal = activityTotal + transportTotal + foodTotal;

  return (
    <div className="flex items-center justify-between px-1 py-3 mt-3 border-t border-gray-200 dark:border-zinc-700/30">
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {activityTotal > 0 && (
          <span className="flex items-center gap-1">
            <Ticket className="w-3 h-3" />${activityTotal}
          </span>
        )}
        {transportTotal > 0 && (
          <span className="flex items-center gap-1">
            <Car className="w-3 h-3" />${transportTotal}
          </span>
        )}
        {foodTotal > 0 && (
          <span className="flex items-center gap-1">
            <UtensilsCrossed className="w-3 h-3" />${foodTotal}
          </span>
        )}
      </div>
      <span className="text-xs font-medium text-gray-900 dark:text-white">
        ${dayTotal}
      </span>
    </div>
  );
}
