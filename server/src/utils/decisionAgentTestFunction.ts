/**
 * Test script for decision agent
 * Run: pnpm tsx src/utils/decisionAgentTestFunction.ts
 */

import { ITripContext, IScheduledActivity } from "../types/interface.js";
import { runDecisionAgent } from "./decisionAgent.js";

const log = (message: string, data?: any) => {
  console.log(`\n[Test] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const mockScheduledActivities: IScheduledActivity[] = [
  {
    id: "eiffel-tower",
    title: "Visit Eiffel Tower",
    scheduled_time: "2026-05-02T14:00:00Z",
    time_of_day: "afternoon",
    location: { lat: 48.8584, lng: 2.2945 },
    duration_minutes: 120,
  },
  {
    id: "louvre-museum",
    title: "Explore Louvre Museum",
    scheduled_time: "2026-05-02T18:00:00Z",
    time_of_day: "evening",
    location: { lat: 48.8606, lng: 2.3376 },
    duration_minutes: 180,
  },
];

const mockContext: ITripContext = {
  user: {
    id: "test-user-1",
    location: {
      lat: 48.8606,
      lng: 2.3376, // Near Louvre
      accuracy_meters: 10,
      is_approximate: false,
    },
    preferences: {
      travel_style: "balanced",
      dietary: ["vegetarian"],
      interests: ["museums", "food", "history"],
      walking_tolerance: "moderate",
    },
  },
  trip: {
    id: "paris-trip-1",
    destination: "Paris, France",
    destination_lat: 48.8566,
    destination_lng: 2.3522,
    day_number: 2,
    total_days: 5,
    timezone: "Europe/Paris",
  },
  temporal: {
    current_time: "2026-05-02T10:30:00+02:00",
    time_of_day: "morning",
    local_timezone: "Europe/Paris",
  },
  environment: {
    weather: {
      condition: "sunny",
      temperature: 18,
      precipitation: false,
    },
  },
  schedule: {
    next_activity: mockScheduledActivities[0],
    time_until_next: 210, // 3.5 hours
    today_activities: mockScheduledActivities,
  },
};

const runTest = async () => {
  log("Starting Decision Agent Test...");
  log("Mock Context:", mockContext);

  const logger = (...args: any[]) => {
    console.log("[Agent]", ...args);
  };

  try {
    log("Running Decision Agent...");
    const startTime = Date.now();

    const result = await runDecisionAgent(mockContext, logger);

    const duration = Date.now() - startTime;
    log(`Decision Agent completed in ${duration}ms`);
    log("Result:", result);

    // Validate result
    console.log("\n--- Validation ---");
    console.log("Has options:", result.options.length > 0 ? "✓" : "✗");
    console.log("Has context_summary:", result.context_summary ? "✓" : "✗");
    console.log("Fallback used:", result.fallback_used ? "Yes" : "No");

    if (result.options.length > 0) {
      console.log("\nOptions:");
      result.options.forEach((option, i) => {
        console.log(
          `  ${i + 1}. ${option.title} (${option.type}) - ${option.reason}`
        );
      });
    }
  } catch (error: any) {
    console.error("Test failed:", error.message);
  }

  log("Decision Agent Test Complete!");
};

runTest();
