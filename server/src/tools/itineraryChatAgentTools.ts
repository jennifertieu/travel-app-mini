import { ChatCompletionTool } from "openai/resources/chat/completions";

export const itineraryChatAgentTools: ChatCompletionTool[] = [
  // === Existing tools (adapted for edit context) ===
  {
    type: "function",
    function: {
      name: "assign_activity_to_day",
      description:
        "Assign an activity from the unassigned pool to a day and time slot. Use this when the user wants to add an unassigned activity back into the itinerary.",
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
      name: "get_all_travel_times",
      description:
        "Get travel times between two activities for ALL travel modes (walking, transit, driving). Use this to check if a move makes sense logistically.",
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
        "Add a 'Travel to [destination]' activity to the itinerary. Use this when activities in different cities need a visible travel block between them.",
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
              "The time slot(s) this travel occupies. Use multiple slots for long journeys.",
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
      name: "check_day_conflicts",
      description:
        "Validate that activities assigned to a specific day don't have time or duration conflicts. Use this after making changes to verify the schedule is realistic.",
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
        "Retrieve detailed information about a specific activity including location, duration, preferences, and enrichment data.",
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

  // === New tools for conversational editing ===
  {
    type: "function",
    function: {
      name: "remove_activity_from_day",
      description:
        "Remove an activity from a specific day. You can optionally return it to the unassigned pool for later reassignment, or discard it entirely.",
      parameters: {
        type: "object",
        properties: {
          activity_id: {
            type: "string",
            description: "The unique ID of the activity to remove",
          },
          day_number: {
            type: "number",
            description: "The day number the activity is currently on",
          },
          return_to_pool: {
            type: "boolean",
            description:
              "If true, the activity goes back to the unassigned pool. If false, it is discarded.",
          },
        },
        required: ["activity_id", "day_number", "return_to_pool"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "move_activity",
      description:
        "Move an activity from its current day and time slot to a different day and/or time slot. Searches all days to find the activity automatically.",
      parameters: {
        type: "object",
        properties: {
          activity_id: {
            type: "string",
            description: "The unique ID of the activity to move",
          },
          to_day_number: {
            type: "number",
            description: "The target day number to move the activity to",
          },
          to_time_of_day: {
            type: "string",
            enum: ["morning", "afternoon", "evening"],
            description: "The target time slot",
          },
        },
        required: ["activity_id", "to_day_number", "to_time_of_day"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "swap_activities",
      description:
        "Swap two activities' positions in the itinerary. Each activity takes the other's day and time slot assignment.",
      parameters: {
        type: "object",
        properties: {
          activity_id_a: {
            type: "string",
            description: "The ID of the first activity to swap",
          },
          activity_id_b: {
            type: "string",
            description: "The ID of the second activity to swap",
          },
        },
        required: ["activity_id_a", "activity_id_b"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];
