import { openai } from "../config.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { itineraryAgentTools } from "../tools/itineraryAgentTools.js";
import { assignActivityToDay, IItinerary } from "./assignActivityToDay.js";
import { travelTimeBetweenActivities } from "./travelTimeBetweenActivities.js";
import { checkDayConflicts } from "./checkDayConflicts.js";
import { getActivityDetails } from "./getActivityDetails.js";
import { createOpenSlot } from "./createOpenSlot.js";

interface ITripData {
  trip: any;
  tripIdeas: any[];
}

interface IToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const aiItineraryBuilderAgent = async (tripData: ITripData) => {
    // Activities now use latitude/longitude and cost_bucket ($, $$, $$$)
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
    - Name: ${idea.name}
    - Location: lat=${idea.latitude ?? ""}, lng=${idea.longitude ?? ""}
    - Duration: ${idea.duration_minutes || idea.duration_bucket || "Unknown"} minutes
    - Description: ${idea.description}
    - Tags: ${idea.tags ? idea.tags.join(", ") : "None"}
    - Cost: ${idea.cost_bucket === "$" || idea.cost_bucket === "$$" || idea.cost_bucket === "$$$" ? idea.cost_bucket : "Unknown"}
    `
      )
      .join("\n")}
    
    Please create an optimized itinerary by:
    1. Analyzing all available activities
    2. Assigning activities to specific days and time slots (morning, afternoon, evening)
    3. Checking for conflicts and travel time between activities
    4. Adding open slots for flexibility when needed
    
    Use the available tools to build the itinerary step by step. Return the final itinerary as a JSON structure with days, time slots, and assigned activities.
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: itineraryAgentTools,
      temperature: 0.1,
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      throw new Error("No response from OpenAI");
    }

    messages.push(message);

    // Check if there are tool calls
    const toolCalls = message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // LLM returned final answer
      return message.content || "Itinerary creation completed";
    }

    // Process each tool call
    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") continue;
      const { name, arguments: args } = toolCall.function;
      let toolResult: IToolCallResult;

      try {
        const parsedArgs = JSON.parse(args);

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
            } else if (!fromActivity.location || !toActivity.location) {
              toolResult = {
                success: false,
                error: "Activity locations missing",
              };
            } else {
              const travelResult = await travelTimeBetweenActivities(
                fromActivity.location,
                toActivity.location,
                parsedArgs.travel_mode || "driving"
              );
              toolResult = { success: true, data: travelResult };
            }
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
            break;

          case "create_open_slot":
            // Find the day from our itinerary to get the date
            const dayForSlot = itinerary.days.find(
              (d) => d.day_number === parsedArgs.day_number
            );
            if (!dayForSlot) {
              toolResult = {
                success: false,
                error: `Day ${parsedArgs.day_number} not found in itinerary`,
              };
              break;
            }

            const openSlot = createOpenSlot(
              dayForSlot,
              parsedArgs.time_of_day,
              parsedArgs.duration_hours * 60
            );
            toolResult = { success: true, data: openSlot };
            break;

          default:
            toolResult = { success: false, error: `Unknown tool: ${name}` };
        }
      } catch (error: any) {
        toolResult = { success: false, error: error.message };
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
