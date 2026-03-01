import { openai } from "../config.js";

const LOG_PREFIX = "[cost-enrichment]";

interface CostAIResponse {
  days: Array<{
    day_number: number;
    transport_estimate: number;
    transport_note: string;
    activities: Array<{
      name: string;
      cost_estimate: number;
      cost_type: "food" | "activity";
    }>;
  }>;
}

export async function enrichItineraryWithCosts(
  itinerary: any,
  destination: string,
  tripDays: number,
): Promise<any> {
  try {
    // Build a compact summary of the itinerary for the AI prompt
    const daySummaries = itinerary.days.map((day: any) => ({
      day_number: day.day_number ?? day.day,
      activities: day.activities
        .filter((a: any) => (a.name || a.title) !== "Free Time")
        .map((a: any) => ({
          name: a.name || a.title,
          category: a.category || "general",
          location:
            typeof a.location === "string"
              ? a.location
              : a.location?.name || "",
        })),
    }));

    const prompt = `Given this itinerary for ${destination} (${tripDays} days), estimate costs per person in USD.

For each activity, provide:
- cost_estimate: number (realistic USD amount based on destination cost of living)
- cost_type: "food" or "activity"

For each day, provide:
- transport_estimate: number (daily local transport cost)
- transport_note: string (e.g., "Airport transfer + metro" or "Walkable day, all nearby")

Consider:
- ${destination}'s cost of living and typical tourist prices
- Activity categories (food items cost differently than museum entries)
- Geographic spread of activities per day for transport estimates
- Day 1 and last day include airport transfers (~$30-50)

Itinerary:
${JSON.stringify(daySummaries, null, 2)}

Return ONLY valid JSON: { "days": [{ "day_number": number, "transport_estimate": number, "transport_note": string, "activities": [{ "name": string, "cost_estimate": number, "cost_type": "food"|"activity" }] }] }`;

    console.log(
      `${LOG_PREFIX} Requesting cost estimates for ${destination}...`,
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a travel cost estimation expert. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty AI response");

    const costData: CostAIResponse = JSON.parse(raw);
    console.log(
      `${LOG_PREFIX} Got cost data for ${costData.days?.length ?? 0} days`,
    );

    // Merge cost data onto itinerary
    for (const day of itinerary.days) {
      const dayNum = day.day_number ?? day.day;
      const costDay = costData.days?.find((d) => d.day_number === dayNum);
      if (!costDay) continue;

      day.transport_estimate = costDay.transport_estimate || 0;
      day.transport_note = costDay.transport_note || "";

      for (const activity of day.activities) {
        const actName = (activity.name || activity.title || "")
          .toLowerCase()
          .trim();
        if (!actName || actName === "free time") {
          activity.cost_estimate = 0;
          activity.cost_type = "activity";
          continue;
        }
        // Try exact match first, then fuzzy (includes) match
        const costActivity =
          costDay.activities?.find(
            (a) => a.name.toLowerCase().trim() === actName,
          ) ??
          costDay.activities?.find(
            (a) =>
              actName.includes(a.name.toLowerCase().trim()) ||
              a.name.toLowerCase().trim().includes(actName),
          );
        if (costActivity) {
          activity.cost_estimate = costActivity.cost_estimate || 0;
          activity.cost_type = costActivity.cost_type || "activity";
        } else {
          activity.cost_estimate = 0;
          activity.cost_type = "activity";
        }
      }
    }

    // Calculate budget summary
    let activitiesTotal = 0;
    let foodTotal = 0;
    let transportTotal = 0;

    for (const day of itinerary.days) {
      transportTotal += day.transport_estimate || 0;
      for (const activity of day.activities) {
        if (activity.cost_type === "food") {
          foodTotal += activity.cost_estimate || 0;
        } else {
          activitiesTotal += activity.cost_estimate || 0;
        }
      }
    }

    const total = activitiesTotal + foodTotal + transportTotal;
    itinerary.budget = {
      flights: 0,
      hotel: 0,
      activities: activitiesTotal,
      food: foodTotal,
      transport: transportTotal,
      total,
      per_day_average: tripDays > 0 ? Math.round(total / tripDays) : 0,
    };

    console.log(
      `${LOG_PREFIX} Budget: $${total} total ($${itinerary.budget.per_day_average}/day)`,
    );
    return itinerary;
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Cost enrichment failed:`, error.message);
    // Return itinerary unchanged — cost fields will be undefined/missing
    return itinerary;
  }
}
