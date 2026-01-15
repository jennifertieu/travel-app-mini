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
  logger?: (...args: any[]) => void
) => {
  const { trip, tripIdeas } = tripData;

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const tripDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
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
    You are an expert travel itinerary planner. Create a detailed itinerary for this trip:

    Trip Details:
    - Destination: ${trip.destination}
    - Start Date: ${trip.start_date}
    - End Date: ${trip.end_date}
    - Duration: ${Math.ceil(
      (new Date(trip.end_date).getTime() -
        new Date(trip.start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    )} days

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
    - Tags: ${idea.tags ? idea.tags.join(", ") : "None"}
    `
      )
      .join("\n")}

    IMPORTANT INSTRUCTIONS FOR TRAVEL PLANNING:

    1. **Group activities by location/region**: Activities in the same city should be scheduled together. NEVER bounce between cities in a single day (e.g., Paris morning → Lyon afternoon → Paris evening is BAD).

    2. **Optimize within-city sequencing**: For activities in the same city, check walking times between ALL pairs to find the optimal order. Just because two activities "fit" in consecutive slots doesn't mean it's the best order.
       - Example: If A→B is 25min walk but A→C is 3min walk, do A→C first even if B was listed first
       - Use get_all_travel_times to compare walking distances within a city cluster

    3. **Check travel times between activities**: Use get_all_travel_times to check travel between consecutive activities. This returns ALL travel modes (walking, transit, driving) so you can compare.

    4. **Prioritize walking**: If walking time is reasonable (under 30 minutes), no travel segment is needed - just schedule activities back-to-back.

    5. **Add travel segments for distant locations**: When activities are in different cities or far apart:
       - Use add_travel_segment to add a "Travel to [destination]" activity
       - This shows users when they need to travel
       - For long journeys (e.g., 4+ hours), use multiple time slots (e.g., ["morning", "afternoon"])
       - The travel segment uses up those time slots, so schedule the destination activity in a later slot

    6. **Time slot guidelines**:
       - Each time slot is roughly 3 hours
       - Morning: ~7am-12pm
       - Afternoon: ~12pm-5pm
       - Evening: ~5pm-10pm
       - A 5-hour train ride would use morning+afternoon, leaving evening for an activity

    7. **Example flow for multi-city trip**:
       - Day 1: Paris activities (Trocadéro morning → Eiffel Tower morning, Champs-Élysées afternoon) - grouped by walking proximity
       - Day 2: Paris (Louvre morning+afternoon), Travel to Lyon (evening)
       - Day 3: Lyon activities all day
       - Day 4: Travel to Marseille, Marseille activities

    Please create an optimized itinerary by:
    1. First, analyze all activities and group them by location/city
    2. For each city cluster, check walking times between activities to find optimal sequence
    3. Plan which days to spend in each location
    4. Check travel times between cities using get_all_travel_times
    5. Add travel segments when moving between cities
    6. Assign activities to specific days and time slots in optimal walking order
    7. Check for conflicts within each day

    IMPORTANT: Try to assign ALL ${tripIdeas.length} activities to the itinerary. If some activities don't fit due to time constraints or travel logistics, that's okay - leave those activities unassigned. The system will track which activities couldn't be scheduled.

    Use the available tools to build the itinerary step by step. When done, stop calling tools - the system will return the built itinerary automatically.
  `;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a travel itinerary planning assistant. Use the provided tools to create optimized itineraries.",
    },
    { role: "user", content: initialPrompt },
  ];

  let maxIterations = 20;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    if (logger)
      logger(
        `[AI AGENT] Iteration ${iterations}: Requesting next step from LLM...`
      );

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: itineraryAgentTools,
      temperature: 0.1,
    });

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
          `[AI AGENT] LLM returned final answer. Running post-processing...`
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
          `[AI AGENT] Post-processing: Added ${filledSlots} free time slots to fill empty periods.`
        );
      }

      if (logger && itinerary.activities_pool.length > 0) {
        logger(
          `[AI AGENT] Note: ${itinerary.activities_pool.length} activities could not be scheduled.`
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
            `[AI AGENT] Calling tool: ${name} with args: ${JSON.stringify(parsedArgs)}`
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
                `[AI AGENT] assign_activity_to_day result: ${JSON.stringify(toolResult)}`
              );
            break;

          case "get_travel_time_between_activities":
            const fromActivity = tripIdeas.find(
              (idea) => idea.id === parsedArgs.from
            );
            const toActivity = tripIdeas.find(
              (idea) => idea.id === parsedArgs.to
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
                parsedArgs.travel_mode || "driving"
              );
              toolResult = { success: true, data: travelResult };
            }
            if (logger)
              logger(
                `[AI AGENT] get_travel_time_between_activities result: ${JSON.stringify(toolResult)}`
              );
            break;

          case "check_day_conflicts":
            // Find the day from our itinerary to get the date
            const dayFromItinerary = itinerary.days.find(
              (d) => d.day_number === parsedArgs.day_number
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
                  (idea) => idea.id === activityRef.activity_id
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
                `[AI AGENT] check_day_conflicts result: ${JSON.stringify(toolResult)}`
              );
            break;

          case "get_activity_details":
            const activity_detail = tripIdeas.find(
              (idea) => idea.id === parsedArgs.activity_id
            );
            if (!activity_detail) {
              toolResult = { success: false, error: "Activity not found" };
            } else {
              const details = getActivityDetails(activity_detail);
              toolResult = { success: true, data: details };
            }
            if (logger)
              logger(
                `[AI AGENT] get_activity_details result: ${JSON.stringify(toolResult)}`
              );
            break;

          case "get_all_travel_times":
            const fromAct = tripIdeas.find(
              (idea) => idea.id === parsedArgs.from_activity_id
            );
            const toAct = tripIdeas.find(
              (idea) => idea.id === parsedArgs.to_activity_id
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
                parsedArgs.available_minutes
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
                `[AI AGENT] get_all_travel_times result: ${JSON.stringify(toolResult)}`
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
                `[AI AGENT] add_travel_segment result: ${JSON.stringify(toolResult)}`
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
