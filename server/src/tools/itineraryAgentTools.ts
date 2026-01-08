import { ChatCompletionTool } from "openai/resources/chat/completions";

export const itineraryAgentTools: ChatCompletionTool[] = [
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
      name: "get_travel_time_between_activities",
      description:
        "Calculate the travel time in minutes between two specific activities using Google Maps. Use this to optimize activity placement and minimize travel time between consecutive activities.",
      parameters: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "The ID of the starting activity",
          },
          to: {
            type: "string",
            description: "The ID of the destination activity",
          },
          travel_mode: {
            type: "string",
            enum: ["driving", "walking", "transit"],
            description: "The mode of transportation to calculate for",
          },
        },
        required: ["from", "to"],
        additionalProperties: false,
      },
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
  {
    type: "function",
    function: {
      name: "create_open_slot",
      description:
        "Create an open time slot for free time or unplanned activities in the itinerary. Use this to ensure the schedule isn't too packed and allows for flexibility.",
      parameters: {
        type: "object",
        properties: {
          day_number: {
            type: "number",
            description: "The day number to add the open slot to",
          },
          time_of_day: {
            type: "string",
            enum: ["morning", "afternoon", "evening"],
            description: "The time slot for the open period",
          },
          duration_hours: {
            type: "number",
            description: "How many hours this open slot should be",
          },
          note: {
            type: "string",
            description: "Optional note about what this time could be used for",
          },
        },
        required: ["day_number", "time_of_day", "duration_hours"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];
