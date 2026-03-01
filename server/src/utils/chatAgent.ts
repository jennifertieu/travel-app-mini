import { openai, GOOGLE_MAPS_PLATFORM_API_KEY } from "../config.js";
import { duringTripAgentTools } from "../tools/duringTripAgentTools.js";
import {
  ITripContext,
  IDecisionOption,
  IFoodRecommendation,
  IGooglePlaceResult,
} from "../types/interface.js";
import { getFoodRecommendations } from "./foodRecommendations.js";
import { travelTimeBetweenActivities } from "./travelTimeBetweenActivities.js";

export interface IChatCard {
  type: "suggestion" | "food";
  data: IDecisionOption | IFoodRecommendation;
}

export interface IChatResponse {
  text: string;
  cards?: IChatCard[];
  context_summary?: string;
}

const fetchNearbyPlaces = async (
  lat: number,
  lng: number,
  placeType: string,
  radiusMeters: number = 1500
): Promise<IGooglePlaceResult[]> => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=${placeType}&key=${GOOGLE_MAPS_PLATFORM_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];
    return data.results || [];
  } catch {
    return [];
  }
};

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
 * Run the Chat Agent — a conversational wrapper around the Decision Agent.
 *
 * Unlike runDecisionAgent which always asks "what should I do?", this accepts
 * free-form user messages and returns conversational text + optional structured cards.
 */
export const runChatAgent = async (
  context: ITripContext,
  userMessage: string
): Promise<IChatResponse> => {
  const TIMEOUT_MS = 15000;
  const MAX_ITERATIONS = 10;

  const systemPrompt = `You are a friendly, concise travel assistant helping a user during their trip. You have access to tools to look up nearby places, check travel times, see their itinerary, and find food.

Current Context:
- Location: ${context.user.location.lat}, ${context.user.location.lng} (${context.user.location.is_approximate ? "approximate" : "GPS"})
- Time: ${context.temporal.time_of_day} (${context.temporal.current_time})
- Trip: Day ${context.trip.day_number} of ${context.trip.total_days} in ${context.trip.destination}
- Weather: ${context.environment.weather ? `${context.environment.weather.condition}, ${context.environment.weather.temperature}°C / ${context.environment.weather.temperature_f}°F` : "Unknown"}
- User Style: ${context.user.preferences.travel_style}
- Interests: ${context.user.preferences.interests.join(", ") || "General"}
- Dietary: ${context.user.preferences.dietary.join(", ") || "None specified"}
- Walking Tolerance: ${context.user.preferences.walking_tolerance}

Today's Schedule:
${context.schedule.today_activities.map((a) => `- ${a.title} (${a.time_of_day})`).join("\n") || "No activities scheduled"}
${context.schedule.next_activity ? `\nNext Up: ${context.schedule.next_activity.title} in ~${Math.round((context.schedule.time_until_next || 0) / 60)} hours` : ""}

INSTRUCTIONS:
- Answer the user's question naturally and concisely
- Use your tools to gather real data before making recommendations
- When suggesting activities or places, include them as structured cards in your response
- Keep text responses short (2-3 sentences max) — let the cards do the heavy lifting

RESPONSE FORMAT — you MUST respond with valid JSON:
{
  "text": "Your conversational response here",
  "cards": [
    {
      "type": "suggestion",
      "data": {
        "id": "unique-id",
        "title": "Place Name",
        "type": "scheduled|spontaneous|rest",
        "distance_km": 0.5,
        "time_required_minutes": 60,
        "energy_level": "low|medium|high",
        "reason": "Brief reason",
        "coordinates": { "lat": 48.8584, "lng": 2.2945 }
      }
    },
    {
      "type": "food",
      "data": {
        "id": "unique-id",
        "name": "Restaurant Name",
        "type": "restaurant|cafe|quick_bite|park_rest",
        "cuisine": "Italian",
        "price_level": 2,
        "distance_km": 0.3,
        "walking_time_minutes": 5,
        "reason": "Brief reason",
        "coordinates": { "lat": 48.8584, "lng": 2.2945 },
        "dietary_match": true,
        "rating": 4.5
      }
    }
  ]
}

Only include "cards" when you have concrete place/activity recommendations. For general conversation (greetings, clarifications, tips), just return { "text": "..." }.`;

  type Message = Parameters<typeof openai.chat.completions.create>[0]["messages"][number];
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  const startTime = Date.now();

  try {
    while (iterations < MAX_ITERATIONS) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        return {
          text: "I'm taking a bit longer than usual. Let me give you some quick suggestions based on your schedule.",
          context_summary: buildContextSummary(context),
        };
      }

      iterations++;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: duringTripAgentTools,
        temperature: 0.4,
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error("No response from OpenAI");
      }

      messages.push(message);

      const toolCalls = message.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        // Final answer — parse JSON response
        if (message.content) {
          try {
            const jsonMatch = message.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return {
                text: parsed.text || message.content,
                cards: parsed.cards || undefined,
                context_summary: buildContextSummary(context),
              };
            }
          } catch {
            // JSON parse failed — fall through to raw text
          }
          // Return the model's raw text if JSON parsing didn't work
          return {
            text: message.content,
            context_summary: buildContextSummary(context),
          };
        }
        return {
          text: "I'm not sure how to help with that. Try asking about nearby places, food recommendations, or what to do next!",
          context_summary: buildContextSummary(context),
        };
      }

      // Process tool calls (same logic as decisionAgent.ts)
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        const { name, arguments: args } = toolCall.function;
        let toolResult: { success: boolean; data?: unknown; error?: string };

        try {
          const parsedArgs = JSON.parse(args);

          switch (name) {
            case "get_nearby_places": {
              const places = await fetchNearbyPlaces(
                context.user.location.lat,
                context.user.location.lng,
                parsedArgs.place_type,
                parsedArgs.radius_meters ?? 1500
              );
              toolResult = {
                success: true,
                data: places.slice(0, 5).map((p) => ({
                  id: p.place_id,
                  name: p.name,
                  location: p.geometry.location,
                  rating: p.rating,
                  types: p.types,
                  distance_km: calculateDistanceKm(
                    context.user.location.lat,
                    context.user.location.lng,
                    p.geometry.location.lat,
                    p.geometry.location.lng
                  ),
                })),
              };
              break;
            }

            case "get_travel_time": {
              const travelResult = await travelTimeBetweenActivities(
                {
                  latitude: context.user.location.lat,
                  longitude: context.user.location.lng,
                },
                {
                  latitude: parsedArgs.destination_lat,
                  longitude: parsedArgs.destination_lng,
                },
                parsedArgs.travel_mode ?? "walking"
              );
              toolResult = { success: true, data: travelResult };
              break;
            }

            case "get_scheduled_activities":
              toolResult = {
                success: true,
                data: context.schedule.today_activities,
              };
              break;

            case "get_food_recommendations": {
              const foodResponse = await getFoodRecommendations(context);
              toolResult = { success: true, data: foodResponse };
              break;
            }

            case "get_itinerary_activity_details": {
              const activity = context.schedule.today_activities.find(
                (a) => a.id === parsedArgs.activity_id
              );
              toolResult = activity
                ? { success: true, data: activity }
                : { success: false, error: "Activity not found" };
              break;
            }

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

    return {
      text: "I gathered a lot of information but ran out of time. Try being more specific about what you're looking for!",
      context_summary: buildContextSummary(context),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Chat Agent] Error: ${errorMessage}`);
    return {
      text: "Sorry, I'm having trouble right now. Try again in a moment!",
    };
  }
};

function buildContextSummary(context: ITripContext): string {
  const { temporal, schedule, environment, trip } = context;

  let summary = "";

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

  summary += `Day ${trip.day_number} of ${trip.total_days} in ${trip.destination}. `;

  if (environment.weather) {
    summary += `It's ${environment.weather.temperature}°C (${environment.weather.temperature_f}°F) and ${environment.weather.condition}. `;
  }

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
}
