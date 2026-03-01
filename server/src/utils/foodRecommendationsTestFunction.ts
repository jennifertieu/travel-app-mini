/**
 * Test script for food recommendations
 * Run: pnpm tsx src/utils/foodRecommendationsTestFunction.ts
 */

import { ITripContext } from "../types/interface.js";
import { getFoodRecommendations, clearCachesForTrip } from "./foodRecommendations.js";

const log = (message: string, data?: any) => {
  console.log(`\n[Test] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const mockContext: ITripContext = {
  user: {
    id: "test-user-1",
    location: {
      lat: 48.8606,
      lng: 2.3376, // Near Louvre, Paris
      accuracy_meters: 10,
      is_approximate: false,
    },
    preferences: {
      travel_style: "balanced",
      dietary: ["vegetarian"],
      interests: ["food", "culture"],
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
    current_time: "2026-05-02T12:30:00+02:00",
    time_of_day: "afternoon", // Lunchtime
    local_timezone: "Europe/Paris",
  },
  environment: {
    weather: {
      condition: "sunny",
      temperature: 20,
      temperature_f: 68,
      precipitation: false,
    },
  },
  schedule: {
    today_activities: [],
  },
};

const runTest = async () => {
  log("Starting Food Recommendations Test...");
  log("Mock Context Location:", {
    lat: mockContext.user.location.lat,
    lng: mockContext.user.location.lng,
    time_of_day: mockContext.temporal.time_of_day,
    dietary: mockContext.user.preferences.dietary,
  });

  try {
    log("Fetching food recommendations...");
    const startTime = Date.now();

    const result = await getFoodRecommendations(mockContext);

    const duration = Date.now() - startTime;
    log(`Food recommendations fetched in ${duration}ms`);

    console.log("\n--- Results ---");
    console.log("Suggestion reason:", result.suggestion_reason);
    console.log("Recommendations count:", result.recommendations.length);

    if (result.recommendations.length > 0) {
      console.log("\nTop Recommendations:");
      result.recommendations.forEach((rec, i) => {
        console.log(`\n  ${i + 1}. ${rec.name}`);
        console.log(`     Type: ${rec.type}`);
        console.log(`     Distance: ${rec.distance_km} km`);
        console.log(`     Walking time: ${rec.walking_time_minutes} min`);
        console.log(`     Rating: ${rec.rating || "N/A"}★`);
        console.log(`     Price level: ${"$".repeat(rec.price_level)}`);
        console.log(`     Dietary match: ${rec.dietary_match ? "Yes" : "No"}`);
        console.log(`     Reason: ${rec.reason}`);
      });
    } else {
      console.log("\n  No recommendations found (API may not be configured)");
    }

    // Validate structure
    console.log("\n--- Validation ---");
    console.log("Has suggestion_reason:", result.suggestion_reason ? "✓" : "✗");
    console.log("Has recommendations array:", Array.isArray(result.recommendations) ? "✓" : "✗");

    if (result.recommendations.length > 0) {
      const firstRec = result.recommendations[0];
      console.log("First recommendation has required fields:");
      console.log("  - id:", firstRec.id ? "✓" : "✗");
      console.log("  - name:", firstRec.name ? "✓" : "✗");
      console.log("  - type:", firstRec.type ? "✓" : "✗");
      console.log("  - coordinates:", firstRec.coordinates ? "✓" : "✗");
      console.log("  - distance_km:", typeof firstRec.distance_km === "number" ? "✓" : "✗");
    }

    // Test cache clearing for ended trips
    log("Testing cache clearing for ended trip...");
    const endedTripContext: ITripContext = {
      ...mockContext,
      trip: {
        ...mockContext.trip,
        day_number: 6, // Past total_days (5)
        total_days: 5,
      },
    };
    
    const resultAfterEnd = await getFoodRecommendations(endedTripContext);
    log("Cache cleared for ended trip (day_number > total_days)", {
      recommendations_count: resultAfterEnd.recommendations.length,
    });
  } catch (error: any) {
    console.error("Test failed:", error.message);
  }

  log("Food Recommendations Test Complete!");
};

runTest();
