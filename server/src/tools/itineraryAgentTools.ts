import { ChatCompletionTool } from "openai/resources/chat/completions";

export const itineraryAgentTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_all_travel_times",
      description:
        "Get travel times between two activities for ALL travel modes (walking, transit, driving). Use this to compare options and decide the best way to travel. Returns times for each mode, whether multiple time slots are needed, and the recommended mode based on walking priority.",
      parameters: {
        type: "object",
        properties: {
          from_activity_id: {
            type: "string",
            description: "The ID of the starting activity",
          },
          to_activity_id: {
            type: "string",
            description: "The ID of the destination activity",
          },
          available_minutes: {
            type: "number",
            description:
              "Optional: Maximum minutes available for travel. If provided, will recommend the best mode that fits.",
          },
        },
        required: ["from_activity_id", "to_activity_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_travel_segment",
      description:
        "Add a 'Travel to [destination]' activity to the itinerary. Use this when activities are in different cities/regions and require significant travel time. The travel segment will show up as an activity so users know when to travel. Can span multiple time slots for long journeys (e.g., morning+afternoon for a 5-hour train ride).",
      parameters: {
        type: "object",
        properties: {
          destination_name: {
            type: "string",
            description:
              "The name of the destination city/area (e.g., 'Nice', 'Lyon')",
          },
          destination_location: {
            type: "string",
            description: "The full location string (e.g., 'Nice, France')",
          },
          travel_mode: {
            type: "string",
            enum: ["walking", "transit", "driving"],
            description: "The mode of transportation",
          },
          duration_minutes: {
            type: "number",
            description: "Total travel time in minutes",
          },
          day_number: {
            type: "number",
            description: "The day number to add the travel segment to",
          },
          time_slots: {
            type: "array",
            items: {
              type: "string",
              enum: ["morning", "afternoon", "evening"],
            },
            description:
              "The time slot(s) this travel occupies. Use multiple slots for long journeys (e.g., ['morning', 'afternoon'] for a 5-hour trip)",
          },
        },
        required: [
          "destination_name",
          "destination_location",
          "travel_mode",
          "duration_minutes",
          "day_number",
          "time_slots",
        ],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "assign_activity_to_day",
      description:
        "Assign a specific activity to a day and time slot in the itinerary. Use this to place activities strategically across the trip days, considering travel times, preferences, and logical flow.",
      parameters: {
        type: "object",
        properties: {
          activity_id: {
            type: "string",
            description: "The unique ID of the activity to assign",
          },
          day_number: {
            type: "number",
            description: "The day number (1-based) to assign the activity to",
          },
          time_of_day: {
            type: "string",
            enum: ["morning", "afternoon", "evening"],
            description: "The time slot within the day for this activity",
          },
        },
        required: ["activity_id", "day_number", "time_of_day"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "check_day_conflicts",
      description:
        "Validate that activities assigned to a specific day don't have time or duration conflicts. Use this before finalizing day assignments to ensure a realistic schedule.",
      parameters: {
        type: "object",
        properties: {
          day_number: {
            type: "number",
            description: "The day number to check for conflicts",
          },
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                activity_id: { type: "string" },
                time_of_day: {
                  type: "string",
                  enum: ["morning", "afternoon", "evening"],
                },
              },
              required: ["activity_id", "time_of_day"],
              additionalProperties: false,
            },
            description:
              "Array of activities with their assigned time slots to validate",
          },
        },
        required: ["day_number", "activities"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_details",
      description:
        "Retrieve detailed information about a specific activity including location, duration, preferences, and enrichment data. Use this to make informed decisions about placement.",
      parameters: {
        type: "object",
        properties: {
          activity_id: {
            type: "string",
            description: "The unique ID of the activity to get details for",
          },
        },
        required: ["activity_id"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];
