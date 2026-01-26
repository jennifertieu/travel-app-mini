import { ChatCompletionTool } from "openai/resources/chat/completions";

export const duringTripAgentTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_nearby_places",
      description:
        "Search for points of interest near the user's current location. Returns places like attractions, landmarks, museums, etc. Use this to find spontaneous activity options.",
      parameters: {
        type: "object",
        properties: {
          place_type: {
            type: "string",
            enum: [
              "tourist_attraction",
              "museum",
              "park",
              "point_of_interest",
              "landmark",
            ],
            description: "The type of place to search for",
          },
          radius_meters: {
            type: "number",
            description:
              "Search radius in meters (default: 1500, max: 5000)",
          },
        },
        required: ["place_type"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_travel_time",
      description:
        "Get travel time from the user's current location to a destination. Returns walking time in minutes.",
      parameters: {
        type: "object",
        properties: {
          destination_lat: {
            type: "number",
            description: "Destination latitude",
          },
          destination_lng: {
            type: "number",
            description: "Destination longitude",
          },
          travel_mode: {
            type: "string",
            enum: ["walking", "transit", "driving"],
            description: "Mode of transportation (default: walking)",
          },
        },
        required: ["destination_lat", "destination_lng"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_scheduled_activities",
      description:
        "Get the user's scheduled activities for today from their itinerary. Returns activities with times and locations.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_food_recommendations",
      description:
        "Get nearby restaurant and cafe recommendations based on user preferences and time of day. Returns sorted list with dietary matching.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_itinerary_activity_details",
      description:
        "Get detailed information about a specific scheduled activity from the itinerary.",
      parameters: {
        type: "object",
        properties: {
          activity_id: {
            type: "string",
            description: "The ID of the activity to get details for",
          },
        },
        required: ["activity_id"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];
