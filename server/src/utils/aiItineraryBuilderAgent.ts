import { openai } from "../config.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { itineraryAgentTools } from "../tools/itineraryAgentTools.js";
import { assignActivityToDay, IItinerary } from "./assignActivityToDay.js";
import { travelTimeBetweenActivities } from "./travelTimeBetweenActivities.js";
import { checkDayConflicts } from "./checkDayConflicts.js";
import { getActivityDetails } from "./getActivityDetails.js";
import { createOpenSlot } from "./createOpenSlot.js";
import { findBestTravelMode } from "./findBestTravelMode.js";
import { addTravelSegment } from "./addTravelSegment.js";

interface ITripData {
  trip: any;
  tripIdeas: any[];
}

interface IToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const aiItineraryBuilderAgent = async (
  tripData: ITripData,
  logger?: (...args: any[]) => void,
) => {
  const { trip, tripIdeas } = tripData;

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const tripDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const itinerary: IItinerary = {
    trip_id: trip.id,
    trip_title: trip.title || trip.destination,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    days: Array.from({ length: tripDays }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split("T")[0],
        day_number: i + 1,
        activities: [],
      };
    }),
    activities_pool: [...tripIdeas],
  };

  const initialPrompt = `
    You are an expert travel itinerary planner. Your PRIMARY JOB is to assign activities to days using the assign_activity_to_day tool.

    Trip Details:
    - Destination: ${trip.destination}
    - Start Date: ${trip.start_date}
    - End Date: ${trip.end_date}
    - Duration: ${tripDays} days

    Available Activities (${tripIdeas.length} activities):
    ${tripIdeas
      .map(
        (idea) => `
    - ID: ${idea.id}
    - Name: ${idea.title || idea.name}
    - Location: ${idea.location}
    - Coordinates: lat=${idea.latitude}, lng=${idea.longitude}
    - Duration: ${idea.duration_bucket || idea.duration_minutes || "Unknown"}
    - Preferred Time: ${idea.time_of_day || "Any"}
    - Description: ${idea.summary || idea.description}
    `,
      )
      .join("\n")}

    ===== CRITICAL INSTRUCTIONS =====

    YOUR #1 PRIORITY: Call assign_activity_to_day for EVERY activity above. Do NOT spend time computing travel times between all pairs. That wastes your limited iterations.

    WORKFLOW — follow this EXACT order:
    1. Look at the activities and mentally group them by neighborhood/area based on their coordinates.
    2. IMMEDIATELY start calling assign_activity_to_day for each activity. Spread them across ${tripDays} days, roughly ${Math.ceil(tripIdeas.length / tripDays)} activities per day.
    3. Use time_of_day values: "morning", "afternoon", or "evening". Respect each activity's preferred time if listed.
    4. You may check 2-3 travel times between clusters if the trip spans multiple cities, but do NOT check all pairs.
    5. After assigning all activities, stop calling tools.

    RULES:
    - Call assign_activity_to_day as many times as possible per iteration (batch them).
    - Do NOT return a text itinerary. You MUST use the assign_activity_to_day tool for each activity.
    - Do NOT compute N² travel times. At most check a few key routes between distant areas.
    - Activities in the same neighborhood can be assumed walkable — no travel time check needed.
    - If an activity has no preferred time, assign it to any open slot.
    - It's better to assign all activities imperfectly than to perfectly plan 0 activities.

    You have limited iterations. EVERY iteration should include assign_activity_to_day calls.
    Start assigning NOW.
  `;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a travel itinerary planning assistant. Use the provided tools to create optimized itineraries.",
    },
    { role: "user", content: initialPrompt },
  ];

  let maxIterations = 15;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    if (logger)
      logger(
        `[AI AGENT] Iteration ${iterations}: Requesting next step from LLM...`,
      );

    // Retry once on 429 rate limit using the retry-after header
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        tools: itineraryAgentTools,
        temperature: 0.1,
      });
    } catch (err: any) {
      if (err?.status === 429) {
        const retryAfterMs = parseInt(
          err?.headers?.["retry-after-ms"] ?? "20000",
          10,
        );
        if (logger)
          logger(
            `[AI AGENT] Rate limited, retrying after ${retryAfterMs}ms...`,
          );
        await new Promise((r) => setTimeout(r, retryAfterMs));
        completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          tools: itineraryAgentTools,
          temperature: 0.1,
        });
      } else {
        throw err;
      }
    }

    const message = completion.choices[0]?.message;
    if (!message) {
      if (logger) logger(`[AI AGENT] No response from OpenAI`);
      throw new Error("No response from OpenAI");
    }

    if (logger && message.content) logger(`[AI AGENT] LLM: ${message.content}`);
    messages.push(message);

    // Check if there are tool calls
    const toolCalls = message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // LLM returned final answer - fill empty slots and return itinerary
      if (logger) {
        logger(
          `[AI AGENT] LLM returned final answer. Running post-processing...`,
        );
      }

      // Post-processing: Fill empty time slots with "Free Time"
      const timeSlots: ("morning" | "afternoon" | "evening")[] = [
        "morning",
        "afternoon",
        "evening",
      ];
      let filledSlots = 0;

      for (const day of itinerary.days) {
        for (const slot of timeSlots) {
          const hasActivity = day.activities.some((a: any) => {
            // Check if this slot is covered by an activity
            if (a.time_of_day === slot) return true;
            // Check for multi-slot activities (e.g., "morning-afternoon")
            if (
              typeof a.time_of_day === "string" &&
              a.time_of_day.includes(slot)
            )
              return true;
            return false;
          });

          if (!hasActivity) {
            // Add free time slot using createOpenSlot utility
            createOpenSlot(day, slot, 180);
            filledSlots++;
          }
        }
      }

      if (logger && filledSlots > 0) {
        logger(
          `[AI AGENT] Post-processing: Added ${filledSlots} free time slots to fill empty periods.`,
        );
      }

      if (logger && itinerary.activities_pool.length > 0) {
        logger(
          `[AI AGENT] Note: ${itinerary.activities_pool.length} activities could not be scheduled.`,
        );
      }

      return {
        ...itinerary,
        unassigned_activities: itinerary.activities_pool,
      };
    }

    // Process each tool call
    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") continue;
      const { name, arguments: args } = toolCall.function;
      let toolResult: IToolCallResult;

      try {
        const parsedArgs = JSON.parse(args);
        if (logger)
          logger(
            `[AI AGENT] Calling tool: ${name} with args: ${JSON.stringify(parsedArgs)}`,
          );

        switch (name) {
          case "assign_activity_to_day":
            const assignResult = assignActivityToDay(itinerary, {
              activity_id: parsedArgs.activity_id,
              day_number: parsedArgs.day_number,
              time_of_day: parsedArgs.time_of_day,
            });
            toolResult = assignResult.success
              ? { success: true, data: assignResult }
              : { success: false, error: assignResult.error };
            if (logger)
              logger(
                `[AI AGENT] assign_activity_to_day result: ${JSON.stringify(toolResult)}`,
              );
            break;

          case "get_travel_time_between_activities":
            const fromActivity = tripIdeas.find(
              (idea) => idea.id === parsedArgs.from,
            );
            const toActivity = tripIdeas.find(
              (idea) => idea.id === parsedArgs.to,
            );

            if (!fromActivity || !toActivity) {
              toolResult = {
                success: false,
                error: "One or both activities not found",
              };
            } else if (
              typeof fromActivity.latitude !== "number" ||
              typeof fromActivity.longitude !== "number" ||
              typeof toActivity.latitude !== "number" ||
              typeof toActivity.longitude !== "number"
            ) {
              toolResult = {
                success: false,
                error: "Activity locations missing",
              };
            } else {
              const travelResult = await travelTimeBetweenActivities(
                {
                  latitude: fromActivity.latitude,
                  longitude: fromActivity.longitude,
                },
                {
                  latitude: toActivity.latitude,
                  longitude: toActivity.longitude,
                },
                parsedArgs.travel_mode || "driving",
              );
              toolResult = { success: true, data: travelResult };
            }
            if (logger)
              logger(
                `[AI AGENT] get_travel_time_between_activities result: ${JSON.stringify(toolResult)}`,
              );
            break;

          case "check_day_conflicts":
            // Find the day from our itinerary to get the date
            const dayFromItinerary = itinerary.days.find(
              (d) => d.day_number === parsedArgs.day_number,
            );
            if (!dayFromItinerary) {
              toolResult = {
                success: false,
                error: `Day ${parsedArgs.day_number} not found in itinerary`,
              };
              break;
            }

            // Construct day object with activities for conflict checking
            const dayActivities = parsedArgs.activities
              .map((activityRef: any) => {
                const activity = itinerary.activities_pool.find(
                  (idea) => idea.id === activityRef.activity_id,
                );
                return activity
                  ? { ...activity, time_of_day: activityRef.time_of_day }
                  : null;
              })
              .filter(Boolean);

            const dayObject = {
              date: dayFromItinerary.date,
              day_number: parsedArgs.day_number,
              activities: dayActivities,
            };

            const conflictResult = await checkDayConflicts(dayObject);
            toolResult = { success: true, data: conflictResult };
            if (logger)
              logger(
                `[AI AGENT] check_day_conflicts result: ${JSON.stringify(toolResult)}`,
              );
            break;

          case "get_activity_details":
            const activity_detail = tripIdeas.find(
              (idea) => idea.id === parsedArgs.activity_id,
            );
            if (!activity_detail) {
              toolResult = { success: false, error: "Activity not found" };
            } else {
              const details = getActivityDetails(activity_detail);
              toolResult = { success: true, data: details };
            }
            if (logger)
              logger(
                `[AI AGENT] get_activity_details result: ${JSON.stringify(toolResult)}`,
              );
            break;

          case "get_all_travel_times":
            const fromAct = tripIdeas.find(
              (idea) => idea.id === parsedArgs.from_activity_id,
            );
            const toAct = tripIdeas.find(
              (idea) => idea.id === parsedArgs.to_activity_id,
            );

            if (!fromAct || !toAct) {
              toolResult = {
                success: false,
                error: "One or both activities not found",
              };
            } else if (
              typeof fromAct.latitude !== "number" ||
              typeof fromAct.longitude !== "number" ||
              typeof toAct.latitude !== "number" ||
              typeof toAct.longitude !== "number"
            ) {
              toolResult = {
                success: false,
                error: "Activity locations missing coordinates",
              };
            } else {
              const travelOptions = await findBestTravelMode(
                { latitude: fromAct.latitude, longitude: fromAct.longitude },
                { latitude: toAct.latitude, longitude: toAct.longitude },
                parsedArgs.available_minutes,
              );
              toolResult = {
                success: true,
                data: {
                  from: {
                    id: fromAct.id,
                    name: fromAct.title,
                    location: fromAct.location,
                  },
                  to: {
                    id: toAct.id,
                    name: toAct.title,
                    location: toAct.location,
                  },
                  ...travelOptions,
                },
              };
            }
            if (logger)
              logger(
                `[AI AGENT] get_all_travel_times result: ${JSON.stringify(toolResult)}`,
              );
            break;

          case "add_travel_segment":
            const travelResult = addTravelSegment(itinerary, {
              destination_name: parsedArgs.destination_name,
              destination_location: parsedArgs.destination_location,
              travel_mode: parsedArgs.travel_mode,
              duration_minutes: parsedArgs.duration_minutes,
              day_number: parsedArgs.day_number,
              time_slots: parsedArgs.time_slots,
            });
            toolResult = travelResult.success
              ? { success: true, data: travelResult }
              : { success: false, error: travelResult.error };
            if (logger)
              logger(
                `[AI AGENT] add_travel_segment result: ${JSON.stringify(toolResult)}`,
              );
            break;

          default:
            toolResult = { success: false, error: `Unknown tool: ${name}` };
            if (logger) logger(`[AI AGENT] Unknown tool: ${name}`);
        }
      } catch (error: any) {
        toolResult = { success: false, error: error.message };
        if (logger) logger(`[AI AGENT] Tool error: ${error.message}`);
      }

      messages.push({
        role: "tool" as const,
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  throw new Error("Maximum iterations reached without completion");
};
