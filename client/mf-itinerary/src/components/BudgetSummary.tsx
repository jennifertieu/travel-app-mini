import { useState } from "react";
import {
  RefreshCw,
  Plane,
  Hotel,
  Ticket,
  UtensilsCrossed,
  Car,
  Users,
  ChevronDown,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { getApiUrl } from "../lib/api";
import type {
  BudgetSummary as BudgetSummaryType,
  ItineraryDay,
} from "../types";

interface BudgetSummaryProps {
  budget: BudgetSummaryType;
  memberCount: number;
  destination?: string;
  tripDays?: number;
  tripId?: string | null;
  days?: ItineraryDay[];
}

export function BudgetSummary({
  budget,
  memberCount,
  tripDays,
  tripId,
  days,
}: BudgetSummaryProps) {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const total = budget.total || 0;
  const dailyAvg =
    budget.per_day_average ||
    (tripDays ? Math.round((total - budget.flights) / tripDays) : 0);
  const groupTotal = total * memberCount;

  const toggleDay = (day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleRecalculate = async () => {
    if (!tripId || isRecalculating) return;
    setIsRecalculating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      await fetch(getApiUrl(`/itinerary/${tripId}/recalculate-budget`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error("Budget recalculate failed:", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const cats = [
    {
      key: "flights" as const,
      label: "Flights",
      Icon: Plane,
      bar: "bg-teal-500",
    },
    { key: "hotel" as const, label: "Hotel", Icon: Hotel, bar: "bg-teal-400" },
    {
      key: "activities" as const,
      label: "Activities",
      Icon: Ticket,
      bar: "bg-emerald-500",
    },
    {
      key: "food" as const,
      label: "Food & Dining",
      Icon: UtensilsCrossed,
      bar: "bg-amber-500",
    },
    {
      key: "transport" as const,
      label: "Transport",
      Icon: Car,
      bar: "bg-cyan-500",
    },
  ];

  return (
    <div className="px-4 py-5 space-y-6">
      {/* Hero total */}
      <div className="text-center space-y-1">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          Estimated total per person
        </p>
        <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          ${total.toLocaleString()}
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {dailyAvg > 0 && <span>~${dailyAvg}/day</span>}
          {memberCount > 1 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {memberCount} travelers
            </span>
          )}
        </div>
      </div>

      {/* Category cards grid */}
      <div className="grid grid-cols-2 gap-2">
        {cats.map(({ key, label, Icon, bar }) => {
          const amount = (budget[key] as number) || 0;
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div
              key={key}
              className="rounded-xl bg-gray-100 dark:bg-zinc-800/80 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {label}
                </span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ${amount.toLocaleString()}
              </p>
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {Math.round(pct)}% of total
              </p>
            </div>
          );
        })}
        {memberCount > 1 && (
          <div className="rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs text-teal-700 dark:text-teal-300">
                Group total
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ${groupTotal.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {memberCount} × ${total.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Daily breakdown — expandable */}
      {days && days.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Daily breakdown
            </p>
          </div>
          {days.map((day) => {
            const actTotal = day.activities.reduce(
              (s, a) =>
                s + (a.cost_type !== "food" ? (a.cost_estimate ?? 0) : 0),
              0,
            );
            const foodTotal = day.activities.reduce(
              (s, a) =>
                s + (a.cost_type === "food" ? (a.cost_estimate ?? 0) : 0),
              0,
            );
            const transTotal = day.transport_estimate ?? 0;
            const dayTotal = actTotal + foodTotal + transTotal;
            if (dayTotal === 0) return null;
            const isExpanded = expandedDays.has(day.day);
            const activitiesWithCost = day.activities.filter(
              (a) => a.cost_estimate && a.cost_estimate > 0,
            );

            return (
              <div
                key={day.day}
                className="rounded-xl bg-gray-50 dark:bg-zinc-800/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleDay(day.day)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Day {day.day}
                    </span>
                    {day.date && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {day.date}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      {actTotal > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Ticket className="w-3 h-3" />${actTotal}
                        </span>
                      )}
                      {foodTotal > 0 && (
                        <span className="flex items-center gap-0.5">
                          <UtensilsCrossed className="w-3 h-3" />${foodTotal}
                        </span>
                      )}
                      {transTotal > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Car className="w-3 h-3" />${transTotal}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${dayTotal}
                    </span>
                  </div>
                </button>

                {isExpanded && activitiesWithCost.length > 0 && (
                  <div className="px-3 pb-3 space-y-1">
                    {activitiesWithCost.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white dark:bg-zinc-900/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {a.cost_type === "food" ? (
                            <UtensilsCrossed className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          ) : (
                            <Ticket className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          )}
                          <span className="text-xs text-gray-700 dark:text-gray-200 truncate">
                            {a.name}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 flex-shrink-0 ml-2">
                          ${a.cost_estimate}
                        </span>
                      </div>
                    ))}
                    {transTotal > 0 && (
                      <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                          <Car className="w-3 h-3 text-cyan-500 flex-shrink-0" />
                          <span className="text-xs text-gray-700 dark:text-gray-200">
                            Transport
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          ${transTotal}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Re-estimate */}
      {tripId && (
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRecalculating ? "animate-spin" : ""}`}
          />
          {isRecalculating ? "Estimating..." : "Re-estimate budget"}
        </button>
      )}
    </div>
  );
}
