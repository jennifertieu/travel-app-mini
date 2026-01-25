import { openai, GOOGLE_MAPS_PLATFORM_API_KEY } from "../config.js";
import { duringTripAgentTools } from "../tools/duringTripAgentTools.js";
import {
  ITripContext,
  IDecisionResponse,
  IDecisionOption,
  IGooglePlaceResult,
} from "../types/interface.js";
import { getFoodRecommendations } from "./foodRecommendations.js";
import { travelTimeBetweenActivities } from "./travelTimeBetweenActivities.js";
import { decisionResponseSchema } from "./validationSchemas.js";

interface IToolCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Fetch nearby places from Google Places API
 */
const fetchNearbyPlaces = async (
  lat: number,
  lng: number,
  placeType: string,
  radiusMeters: number = 1500
): Promise<IGooglePlaceResult[]> => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${placeType}&key=${GOOGLE_MAPS_PLATFORM_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Decision Agent] Places API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error(`[Decision Agent] Places API status: ${data.status}`);
      return [];
    }

    return data.results || [];
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[Decision Agent] Failed to fetch places: ${errorMessage}`
    );
    return [];
  }
};

/**
 * Calculate distance in km using Haversine formula
 * The Haversine formula calculates the great-circle distance between two points on a sphere (e.g., Earth) using their latitude and longitude. 
 */
const calculateDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * Build context summary for the user
 */
const buildContextSummary = (context: ITripContext): string => {
  const { temporal, schedule, environment, trip } = context;

  let summary = "";

  // Time greeting
  switch (temporal.time_of_day) {
    case "morning":
      summary = "Good morning! ";
      break;
    case "afternoon":
      summary = "Good afternoon! ";
      break;
    case "evening":
      summary = "Good evening! ";
      break;
  }

  // Trip context
  summary += `Day ${trip.day_number} of ${trip.total_days} in ${trip.destination}. `;

  // Weather if available
  if (environment.weather) {
    summary += `It's ${environment.weather.temperature}°C and ${environment.weather.condition}. `;
  }

  // Next activity if scheduled
  if (schedule.next_activity && schedule.time_until_next) {
    const hoursUntil = Math.round(schedule.time_until_next / 60);
    if (hoursUntil > 0) {
      summary += `You have ${schedule.next_activity.title} coming up in about ${hoursUntil} hour${hoursUntil > 1 ? "s" : ""}.`;
    } else {
      summary += `${schedule.next_activity.title} is coming up soon.`;
    }
  } else if (schedule.today_activities.length === 0) {
    summary += "You have a free day ahead!";
  }

  return summary;
};

/**
 * Generate rule-based fallback suggestions when AI times out
 */
const generateFallbackResponse = (
  context: ITripContext
): IDecisionResponse => {
  const { schedule } = context;
  const options: IDecisionOption[] = [];

  // Option 1: Next scheduled activity if available
  if (schedule.next_activity?.location) {
    const distanceKm = calculateDistanceKm(
      context.user.location.lat,
      context.user.location.lng,
      schedule.next_activity.location.lat,
      schedule.next_activity.location.lng
    );

    options.push({
      id: schedule.next_activity.id,
      title: schedule.next_activity.title,
      type: "scheduled",
      distance_km: distanceKm,
      time_required_minutes: schedule.next_activity.duration_minutes || 60,
      energy_level: "medium",
      reason: "From your itinerary",
      coordinates: schedule.next_activity.location,
    });
  }

  // Option 2: Rest suggestion
  options.push({
    id: "rest-option",
    title: "Take a break",
    type: "rest",
    distance_km: 0,
    time_required_minutes: 30,
    energy_level: "low",
    reason: "Recharge with a short break",
    coordinates: {
      lat: context.user.location.lat,
      lng: context.user.location.lng,
    },
  });

  // Option 3: Explore nearby
  options.push({
    id: "explore-option",
    title: "Explore the area",
    type: "spontaneous",
    distance_km: 0.5,
    time_required_minutes: 60,
    energy_level: "medium",
    reason: "Discover something new nearby",
    coordinates: {
      lat: context.user.location.lat,
      lng: context.user.location.lng,
    },
  });

  return {
    options: options,
    context_summary: buildContextSummary(context),
    fallback_used: true,
  };
};

/**
 * Run the Decision Agent to get "What Now?" suggestions
 * 
 * This is the primary AI agent for during-trip decision making. It uses OpenAI GPT-4o
 * with function calling to:
 * 1. Analyze current trip context (location, time, weather, schedule)
 * 2. Call tools to gather nearby places, travel times, food recommendations
 * 3. Generate 3-5 personalized activity suggestions
 * 
 * The agent has a 10-second timeout and maximum 10 iterations. If it times out or fails,
 * a rule-based fallback is returned with basic suggestions (next scheduled activity, rest, explore).
 * 
 * @param context - Complete trip context from buildTripContext()
 * @param logger - Optional logging function for debugging (defaults to no-op)
 * 
 * @returns Promise resolving to decision response with options and context summary
 * @returns options - Array of 3-5 activity suggestions (IDecisionOption[])
 * @returns context_summary - Human-readable summary of current situation
 * @returns fallback_used - True if AI timed out and rule-based fallback was used
 * 
 * @example
 * ```typescript
 * const response = await runDecisionAgent(context);
 * // response.options = [{ id: "...", title: "Visit Eiffel Tower", ... }, ...]
 * // response.context_summary = "Good morning! Day 2 of 5 in Paris..."
 * ```
 */
export const runDecisionAgent = async (
  context: ITripContext,
  logger?: (message: string, ...args: unknown[]) => void
): Promise<IDecisionResponse> => {
  const TIMEOUT_MS = 10000; // 10 second timeout
  const MAX_ITERATIONS = 10;

  // Build system prompt with context
  const systemPrompt = `You are a helpful travel assistant helping a user decide what to do right now during their trip.

Current Context:
- Location: ${context.user.location.lat}, ${context.user.location.lng} (${context.user.location.is_approximate ? "approximate" : "accurate"})
- Time: ${context.temporal.time_of_day} (${context.temporal.current_time})
- Trip: Day ${context.trip.day_number} of ${context.trip.total_days} in ${context.trip.destination}
- Weather: ${context.environment.weather ? `${context.environment.weather.condition}, ${context.environment.weather.temperature}°C` : "Unknown"}
- User Style: ${context.user.preferences.travel_style}
- Interests: ${context.user.preferences.interests.join(", ") || "General"}
- Dietary: ${context.user.preferences.dietary.join(", ") || "None specified"}
- Walking Tolerance: ${context.user.preferences.walking_tolerance}

Today's Scheduled Activities:
${context.schedule.today_activities.map((a) => `- ${a.title} (${a.time_of_day})`).join("\n") || "No activities scheduled"}

${context.schedule.next_activity ? `Next Scheduled: ${context.schedule.next_activity.title} in ~${Math.round((context.schedule.time_until_next || 0) / 60)} hours` : ""}

Your job is to:
1. Use the available tools to gather information about nearby options
2. Consider the user's scheduled activities, preferences, and current context
3. Suggest 3-5 options that make sense for right now
4. Always include the next scheduled activity as option 1 if one exists
5. Provide brief, helpful reasons for each suggestion

Be concise. Users want quick, actionable suggestions, not long explanations.

When you have gathered enough information, respond with a JSON object in this exact format:
{
  "options": [
    {
      "id": "unique-id",
      "title": "Activity Name",
      "type": "scheduled|spontaneous|rest",
      "distance_km": 0.5,
      "time_required_minutes": 60,
      "energy_level": "low|medium|high",
      "reason": "Brief reason why this is a good choice",
      "coordinates": { "lat": 48.8584, "lng": 2.2945 }
    }
  ],
  "context_summary": "Brief friendly summary of the current situation"
}`;

  type Message = Parameters<typeof openai.chat.completions.create>[0]["messages"][number];
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: "What should I do right now? Give me some options.",
    },
  ];

  let iterations = 0;
  const startTime = Date.now();

  try {
    while (iterations < MAX_ITERATIONS) {
      // Check timeout
      if (Date.now() - startTime > TIMEOUT_MS) {
        if (logger) logger("[Decision Agent] Timeout - using fallback");
        return generateFallbackResponse(context);
      }

      iterations++;
      if (logger) logger(`[Decision Agent] Iteration ${iterations}`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: duringTripAgentTools,
        temperature: 0.3,
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error("No response from OpenAI");
      }

      messages.push(message);

      // Check for tool calls
      const toolCalls = message.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // LLM returned final answer - parse and return
        if (message.content) {
          try {
            // Extract JSON from the response
            const jsonMatch = message.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              
              // Validate with zod schema
              const validated = decisionResponseSchema.parse(parsed);
              
              return {
                options: validated.options,
                context_summary: validated.context_summary,
                fallback_used: false,
              };
            }
          } catch (parseError) {
            if (logger) {
              const errorMessage = parseError instanceof Error 
                ? parseError.message 
                : String(parseError);
              logger(`[Decision Agent] Failed to parse/validate response: ${errorMessage}`);
            }
          }
        }
        // If parsing failed, use fallback
        return generateFallbackResponse(context);
      }

      // Process tool calls
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        const { name, arguments: args } = toolCall.function;
        let toolResult: IToolCallResult;

        try {
          const parsedArgs = JSON.parse(args);
          if (logger)
            logger(`[Decision Agent] Tool: ${name}, Args: ${JSON.stringify(parsedArgs)}`);

          switch (name) {
            case "get_nearby_places":
              const places = await fetchNearbyPlaces(
                context.user.location.lat,
                context.user.location.lng,
                parsedArgs.place_type,
                parsedArgs.radius_meters || 1500
              );
              toolResult = {
                success: true,
                data: places.slice(0, 5).map((p) => ({
                  id: p.place_id,
                  name: p.name,
                  location: p.geometry.location,
                  rating: p.rating,
                  types: p.types,
                })),
              };
              break;

            case "get_travel_time":
              const travelResult = await travelTimeBetweenActivities(
                {
                  latitude: context.user.location.lat,
                  longitude: context.user.location.lng,
                },
                {
                  latitude: parsedArgs.destination_lat,
                  longitude: parsedArgs.destination_lng,
                },
                parsedArgs.travel_mode || "walking"
              );
              toolResult = { success: true, data: travelResult };
              break;

            case "get_scheduled_activities":
              toolResult = {
                success: true,
                data: context.schedule.today_activities,
              };
              break;

            case "get_food_recommendations":
              const foodResponse = await getFoodRecommendations(context);
              toolResult = { success: true, data: foodResponse };
              break;

            case "get_itinerary_activity_details":
              const activity = context.schedule.today_activities.find(
                (a) => a.id === parsedArgs.activity_id
              );
              if (activity) {
                toolResult = { success: true, data: activity };
              } else {
                toolResult = { success: false, error: "Activity not found" };
              }
              break;

            default:
              toolResult = { success: false, error: `Unknown tool: ${name}` };
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          toolResult = { success: false, error: errorMessage };
        }

        messages.push({
          role: "tool" as const,
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // Max iterations reached
    if (logger) logger("[Decision Agent] Max iterations - using fallback");
    return generateFallbackResponse(context);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Decision Agent] Error: ${errorMessage}`);
    return generateFallbackResponse(context);
  }
};
