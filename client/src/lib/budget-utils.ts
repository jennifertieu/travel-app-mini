import type { ItineraryDay, BudgetSummary } from "@/types";

export function calculateBudgetFromDays(days: ItineraryDay[]): BudgetSummary {
  let activities = 0;
  let food = 0;
  let transport = 0;

  for (const day of days) {
    transport += day.transport_estimate ?? 0;
    for (const activity of day.activities) {
      if (activity.cost_type === "food") {
        food += activity.cost_estimate ?? 0;
      } else {
        activities += activity.cost_estimate ?? 0;
      }
    }
  }

  const total = activities + food + transport;
  const numDays = days.length || 1;

  return {
    flights: 0,
    hotel: 0,
    activities,
    food,
    transport,
    total,
    per_day_average: Math.round(total / numDays),
  };
}
