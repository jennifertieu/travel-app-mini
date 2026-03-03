import { openai } from "../config.js";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { itineraryChatAgentTools } from "../tools/itineraryChatAgentTools.js";
import {
  IChatSession,
  computeChanges,
} from "./chatSessionManager.js";
import { assignActivityToDay, IItinerary } from "./assignActivityToDay.js";
import { removeActivityFromDay } from "./removeActivityFromDay.js";
import { moveActivity } from "./moveActivity.js";
import { swapActivities } from "./swapActivities.js";
import { addTravelSegment } from "./addTravelSegment.js";
import { checkDayConflicts } from "./checkDayConflicts.js";
import { getActivityDetails } from "./getActivityDetails.js";
import { findBestTravelMode } from "./findBestTravelMode.js";
import { validateItineraryIntegrity } from "./validateItineraryIntegrity.js";

interface IToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface IDuringTripContext {
  currentDay?: number;
  totalDays?: number;
  currentDate?: string;
  location?: { lat: number; lng: number };
}

/**
 * Builds a system prompt for the during-trip unified assistant.
 * Handles both itinerary editing (via tools) and general trip assistance (text-only).
 */
const buildSystemPrompt = (
  itinerary: IItinerary,
  context?: IDuringTripContext,
): string => {
  const daysSummary = itinerary.days
    .map((day) => {
      const activities = day.activities
        .map(
          (a) =>
            `    - [${a.time_of_day || "unset"}] ${a.title || a.name || a.id} (ID: ${a.id})${a.type === "travel" ? " [TRAVEL]" : ""}`,
        )
        .join("\n");
      return `  Day ${day.day_number} (${day.date}):\n${activities || "    (empty)"}`;
    })
    .join("\n");

  const pool = itinerary.activities_pool ?? [];
  const poolSummary =
    pool.length > 0
      ? pool
          .map((a) => `  - ${a.title || a.name || a.id} (ID: ${a.id})`)
          .join("\n")
      : "  (none)";

  const contextSection = context
    ? `\nDuring-trip context:
${context.currentDay !== undefined ? `- Currently on Day ${context.currentDay} of ${context.totalDays ?? itinerary.days.length}` : ""}
${context.currentDate ? `- Current date: ${context.currentDate}` : ""}
${context.location ? `- User location: ${context.location.lat.toFixed(5)}, ${context.location.lng.toFixed(5)}` : ""}
`
    : "";

  return `You are a helpful travel assistant supporting someone who is currently on their trip to ${itinerary.destination}. You have two roles:

1. **Trip assistant**: Answer general questions about the destination, suggest things to do nearby, provide travel tips, help with directions, recommend food, or anything else the traveler might need. For these responses, just reply in text — do NOT call any tools.

2. **Itinerary editor**: When the user explicitly asks to change their schedule (move, swap, add, or remove activities), use the available tools to edit the itinerary draft. The user reviews and confirms or rejects changes before they are saved.
${contextSection}
Current Itinerary:
${daysSummary}

Unassigned Activities (pool):
${poolSummary}

Editing rules (only apply when user wants to modify the schedule):
- You are editing a DRAFT. The user will review and confirm or reject your changes.
- Always describe what you changed so the user can verify.
- If the user's request is ambiguous, ask for clarification before making changes.
- Use move_activity to relocate activities between days/slots.
- Use swap_activities to exchange two activities' positions.
- Use remove_activity_from_day to delete an activity (set return_to_pool=true if it might be re-added later).
- Use assign_activity_to_day only for activities currently in the unassigned pool.
- Refer to activities by their names, not IDs, when talking to the user.
- Tense: After using tools, describe what you did as a proposal awaiting confirmation. NEVER say "done", "complete", "saved", or "confirmed". Use language like "Here's the proposal:".
- Keep responses concise. Prefer short, direct summaries over long prose.
- Response format: When listing 2 or more changes, use a markdown bullet list where each item is on its own line.`;
};

/**
 * Finds an activity across all days and the pool.
 */
const findActivityInItinerary = (
  itinerary: IItinerary,
  activityId: string,
): any | null => {
  for (const day of itinerary.days) {
    const activity = day.activities.find((a) => a.id === activityId);
    if (activity) return activity;
  }
  const poolActivity = itinerary.activities_pool.find(
    (a) => a.id === activityId,
  );
  if (poolActivity) return poolActivity;
  return null;
};

/**
 * Executes a single tool call against the draft itinerary.
 */
const executeToolCall = async (
  name: string,
  parsedArgs: any,
  itinerary: IItinerary,
): Promise<IToolCallResult> => {
  switch (name) {
    case "assign_activity_to_day": {
      const result = assignActivityToDay(itinerary, {
        activity_id: parsedArgs.activity_id,
        day_number: parsedArgs.day_number,
        time_of_day: parsedArgs.time_of_day,
      });
      return result.success
        ? { success: true, data: result }
        : { success: false, error: result.error };
    }

    case "remove_activity_from_day": {
      const result = removeActivityFromDay(itinerary, {
        activity_id: parsedArgs.activity_id,
        day_number: parsedArgs.day_number,
        return_to_pool: parsedArgs.return_to_pool,
      });
      return result.success
        ? { success: true, data: result }
        : { success: false, error: result.error };
    }

    case "move_activity": {
      const result = moveActivity(itinerary, {
        activity_id: parsedArgs.activity_id,
        to_day_number: parsedArgs.to_day_number,
        to_time_of_day: parsedArgs.to_time_of_day,
      });
      return result.success
        ? { success: true, data: result }
        : { success: false, error: result.error };
    }

    case "swap_activities": {
      const result = swapActivities(itinerary, {
        activity_id_a: parsedArgs.activity_id_a,
        activity_id_b: parsedArgs.activity_id_b,
      });
      return result.success
        ? { success: true, data: result }
        : { success: false, error: result.error };
    }

    case "add_travel_segment": {
      const result = addTravelSegment(itinerary, {
        destination_name: parsedArgs.destination_name,
        destination_location: parsedArgs.destination_location,
        travel_mode: parsedArgs.travel_mode,
        duration_minutes: parsedArgs.duration_minutes,
        day_number: parsedArgs.day_number,
        time_slots: parsedArgs.time_slots,
      });
      return result.success
        ? { success: true, data: result }
        : { success: false, error: result.error };
    }

    case "check_day_conflicts": {
      const dayFromItinerary = itinerary.days.find(
        (d) => d.day_number === parsedArgs.day_number,
      );
      if (!dayFromItinerary) {
        return {
          success: false,
          error: `Day ${parsedArgs.day_number} not found`,
        };
      }

      const dayActivities = parsedArgs.activities
        .map((ref: any) => {
          const activity = findActivityInItinerary(itinerary, ref.activity_id);
          return activity
            ? { ...activity, time_of_day: ref.time_of_day }
            : null;
        })
        .filter(Boolean);

      const conflictResult = await checkDayConflicts({
        date: dayFromItinerary.date,
        day_number: parsedArgs.day_number,
        activities: dayActivities,
      });
      return { success: true, data: conflictResult };
    }

    case "get_activity_details": {
      const activity = findActivityInItinerary(
        itinerary,
        parsedArgs.activity_id,
      );
      if (!activity) {
        return { success: false, error: "Activity not found" };
      }
      const details = getActivityDetails(activity);
      return { success: true, data: details };
    }

    case "get_all_travel_times": {
      const fromAct = findActivityInItinerary(
        itinerary,
        parsedArgs.from_activity_id,
      );
      const toAct = findActivityInItinerary(
        itinerary,
        parsedArgs.to_activity_id,
      );

      if (!fromAct || !toAct) {
        return {
          success: false,
          error: "One or both activities not found",
        };
      }
      if (
        typeof fromAct.latitude !== "number" ||
        typeof fromAct.longitude !== "number" ||
        typeof toAct.latitude !== "number" ||
        typeof toAct.longitude !== "number"
      ) {
        return {
          success: false,
          error: "Activity locations missing coordinates",
        };
      }

      const travelOptions = await findBestTravelMode(
        { latitude: fromAct.latitude, longitude: fromAct.longitude },
        { latitude: toAct.latitude, longitude: toAct.longitude },
        parsedArgs.available_minutes,
      );
      return {
        success: true,
        data: {
          from: {
            id: fromAct.id,
            name: fromAct.title || fromAct.name,
            location: fromAct.location,
          },
          to: {
            id: toAct.id,
            name: toAct.title || toAct.name,
            location: toAct.location,
          },
          ...travelOptions,
        },
      };
    }

    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
};

/**
 * Streams the during-trip unified chat agent response via SSE.
 *
 * Handles both general trip assistance (text-only, no tools) and
 * itinerary editing (tool calls + changes diff).
 *
 * @param session - The chat session (mutated: messages appended, draftItinerary edited)
 * @param userMessage - The user's natural language message
 * @param emitter - Callback to send SSE events to the client
 * @param context - Optional during-trip context (current day, location)
 */
export const streamDuringTripChatAgent = async (
  session: IChatSession,
  userMessage: string,
  emitter: (event: string, data: any) => void,
  context?: IDuringTripContext,
): Promise<void> => {
  const { draftItinerary, messages } = session;

  // On first message, set the system prompt
  if (messages.length === 0) {
    messages.push({
      role: "system",
      content: buildSystemPrompt(draftItinerary, context),
    });
  } else {
    // Update system prompt with latest itinerary state and context
    messages[0] = {
      role: "system",
      content: buildSystemPrompt(draftItinerary, context),
    };
  }

  // Add user message
  messages.push({ role: "user", content: userMessage });

  const maxIterations = 10;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: itineraryChatAgentTools,
      temperature: 0.3,
      stream: true,
    });

    // Accumulate the streamed response
    let fullContent = "";
    const toolCalls: Array<{
      id: string;
      function: { name: string; arguments: string };
    }> = [];

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      // Stream text content to the client
      if (delta.content) {
        fullContent += delta.content;
        emitter("text", { content: delta.content });
      }

      // Accumulate tool calls from deltas
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.index !== undefined) {
            if (!toolCalls[tc.index]) {
              toolCalls[tc.index] = {
                id: tc.id || "",
                function: { name: "", arguments: "" },
              };
            }
            if (tc.id) toolCalls[tc.index].id = tc.id;
            if (tc.function?.name) {
              toolCalls[tc.index].function.name += tc.function.name;
            }
            if (tc.function?.arguments) {
              toolCalls[tc.index].function.arguments += tc.function.arguments;
            }
          }
        }
      }
    }

    // If no tool calls, the LLM is done — emit changes (if any) and finish
    if (toolCalls.length === 0) {
      if (fullContent) {
        messages.push({ role: "assistant", content: fullContent });
      }

      const changes = computeChanges(session);
      if (changes.length > 0) {
        emitter("changes", { changes });
      }

      emitter("done", {});
      return;
    }

    // Build the assistant message with tool calls for the conversation history
    messages.push({
      role: "assistant",
      content: fullContent || null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: tc.function,
      })),
    });

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const { name, arguments: args } = toolCall.function;
      let toolResult: IToolCallResult;

      try {
        const parsedArgs = JSON.parse(args);

        emitter("tool_call", { tool: name, args: parsedArgs });

        toolResult = await executeToolCall(name, parsedArgs, draftItinerary);

        // Validate itinerary integrity after mutations
        if (
          [
            "assign_activity_to_day",
            "remove_activity_from_day",
            "move_activity",
            "swap_activities",
            "add_travel_segment",
          ].includes(name)
        ) {
          const integrity = validateItineraryIntegrity(draftItinerary);
          if (!integrity.valid) {
            toolResult = {
              success: false,
              error: `Integrity check failed: ${integrity.errors.join(", ")}`,
            };
          }
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

  emitter("error", { message: "Maximum iterations reached" });
  emitter("done", {});
};
