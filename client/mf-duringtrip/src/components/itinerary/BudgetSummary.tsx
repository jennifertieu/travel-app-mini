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
import { supabase } from "../../lib/supabase";
import { getApiUrl } from "../../lib/api";
import type {
  BudgetSummary as BudgetSummaryType,
  ItineraryDay,
} from "../../types/itinerary";

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
  const tripDaysActual = (tripDays ?? (days?.length ?? 0)) || 1;
  const onTheGroundTotal = total - (budget.flights || 0) - (budget.hotel || 0);
  const dailySpendExclFlightsHotel =
    tripDaysActual > 0 ? Math.round(onTheGroundTotal / tripDaysActual) : 0;
  const groupTotal = total * memberCount;

  function formatFriendlyDate(isoDate: string | undefined): string {
    if (!isoDate) return "";
    try {
      return new Date(isoDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoDate;
    }
  }

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
      {/* Hero: daily spend prominent, trip total secondary, refresh in header */}
      <div className="relative">
        <div className="text-center space-y-1">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Daily spend (excl. flights)
          </p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            ~${dailySpendExclFlightsHotel}/day
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trip total: ${total.toLocaleString()}
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {memberCount > 1 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {memberCount} travelers
              </span>
            )}
          </div>
        </div>
        {tripId && (
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="absolute top-0 right-0 p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors disabled:opacity-50"
            aria-label="Re-estimate budget"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRecalculating ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Stacked bar + compact legend */}
      <div className="space-y-3">
        <div className="h-3 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden flex">
          {cats.map(({ key, bar }) => {
            const amount = (budget[key] as number) || 0;
            const pct = total > 0 ? (amount / total) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={key}
                className={`${bar} min-w-[2px] transition-all`}
                style={{ width: `${pct}%` }}
                title={`${key}: $${amount.toLocaleString()}`}
              />
            );
          })}
        </div>
        <ul className="space-y-1.5">
          {cats.map(({ key, label, Icon, bar }) => {
            const amount = (budget[key] as number) || 0;
            const pct = total > 0 ? (amount / total) * 100 : 0;
            const isEmpty = amount === 0;
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${bar}`}
                    aria-hidden
                  />
                  <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-200 truncate">
                    {label}
                  </span>
                </div>
                {isEmpty ? (
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    No {key === "hotel" ? "hotel" : key} added yet
                  </span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-300 flex-shrink-0">
                    ${amount.toLocaleString()}{" "}
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      {Math.round(pct)}%
                    </span>
                  </span>
                )}
              </li>
            );
          })}
          {memberCount > 1 && (
            <li className="flex items-center justify-between gap-2 text-sm pt-1.5 border-t border-gray-200 dark:border-zinc-700">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-teal-500" />
                <span className="text-teal-700 dark:text-teal-300">
                  Group total
                </span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">
                ${groupTotal.toLocaleString()}
              </span>
            </li>
          )}
        </ul>
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
            const isExpanded = expandedDays.has(day.day_number);
            const activitiesWithCost = day.activities.filter(
              (a) => a.cost_estimate && a.cost_estimate > 0,
            );

            return (
              <div
                key={day.day_number}
                className="rounded-xl bg-gray-50 dark:bg-zinc-800/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleDay(day.day_number)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-zinc-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-shrink-0">
                      Day {day.day_number}
                    </span>
                    {day.date && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {formatFriendlyDate(day.date)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden flex min-w-[4rem]"
                      aria-hidden
                    >
                      {actTotal > 0 && (
                        <div
                          className="bg-emerald-500 min-w-[2px]"
                          style={{
                            width: `${(actTotal / dayTotal) * 100}%`,
                          }}
                        />
                      )}
                      {foodTotal > 0 && (
                        <div
                          className="bg-amber-500 min-w-[2px]"
                          style={{
                            width: `${(foodTotal / dayTotal) * 100}%`,
                          }}
                        />
                      )}
                      {transTotal > 0 && (
                        <div
                          className="bg-cyan-500 min-w-[2px]"
                          style={{
                            width: `${(transTotal / dayTotal) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                      ${dayTotal}
                    </span>
                  </div>
                </button>

                {isExpanded && (activitiesWithCost.length > 0 || transTotal > 0) && (
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
                            {a.title}
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
