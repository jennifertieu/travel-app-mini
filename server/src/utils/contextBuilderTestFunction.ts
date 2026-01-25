/**
 * Test script for context builder
 * Run: pnpm tsx src/utils/contextBuilderTestFunction.ts
 */

import {
  buildUserLocation,
  getTimeOfDay,
  calculateDayNumber,
  calculateTotalDays,
  getTodayActivities,
  findNextActivity,
} from "./contextBuilder.js";

const log = (message: string, data?: any) => {
  console.log(`\n[Test] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const runTests = () => {
  log("Starting Context Builder Tests...");

  // Test 1: buildUserLocation with valid location
  log("Test 1: buildUserLocation with valid location");
  const validLocation = buildUserLocation(
    { lat: 48.8606, lng: 2.3376, accuracy_meters: 50 },
    { lat: 48.8566, lng: 2.3522 }
  );
  console.log("  Result:", validLocation);
  console.log(
    "  Pass:",
    !validLocation.is_approximate && validLocation.lat === 48.8606
  );

  // Test 2: buildUserLocation with poor accuracy (fallback)
  log("Test 2: buildUserLocation with poor accuracy");
  const poorAccuracyLocation = buildUserLocation(
    { lat: 48.8606, lng: 2.3376, accuracy_meters: 600 },
    { lat: 48.8566, lng: 2.3522 }
  );
  console.log("  Result:", poorAccuracyLocation);
  console.log(
    "  Pass:",
    poorAccuracyLocation.is_approximate && poorAccuracyLocation.lat === 48.8566
  );

  // Test 3: buildUserLocation with no location (fallback)
  log("Test 3: buildUserLocation with no location");
  const noLocation = buildUserLocation(undefined, { lat: 48.8566, lng: 2.3522 });
  console.log("  Result:", noLocation);
  console.log("  Pass:", noLocation.is_approximate);

  // Test 4: getTimeOfDay
  log("Test 4: getTimeOfDay");
  console.log("  Hour 8 ->", getTimeOfDay(8), "(expected: morning)");
  console.log("  Hour 14 ->", getTimeOfDay(14), "(expected: afternoon)");
  console.log("  Hour 20 ->", getTimeOfDay(20), "(expected: evening)");

  // Test 5: calculateDayNumber
  log("Test 5: calculateDayNumber");
  const tripStart = "2026-05-01";
  const day1 = calculateDayNumber(tripStart, new Date("2026-05-01"));
  const day3 = calculateDayNumber(tripStart, new Date("2026-05-03"));
  console.log("  May 1 (start) ->", day1, "(expected: 1)");
  console.log("  May 3 ->", day3, "(expected: 3)");

  // Test 6: calculateTotalDays
  log("Test 6: calculateTotalDays");
  const totalDays = calculateTotalDays("2026-05-01", "2026-05-05");
  console.log("  May 1-5 ->", totalDays, "(expected: 5)");

  // Test 7: getTodayActivities
  log("Test 7: getTodayActivities");
  const mockItinerary = {
    days: [
      {
        day_number: 1,
        date: "2026-05-01",
        activities: [
          {
            id: "act-1",
            name: "Visit Louvre",
            time_of_day: "morning",
            duration_minutes: 180,
            location: { lat: 48.8606, lng: 2.3376 },
          },
          {
            id: "act-2",
            name: "Free Time",
            time_of_day: "afternoon",
          },
          {
            id: "act-3",
            name: "Eiffel Tower",
            time_of_day: "evening",
            duration_minutes: 120,
            location: { lat: 48.8584, lng: 2.2945 },
          },
        ],
      },
    ],
  };
  const todayActivities = getTodayActivities(mockItinerary, 1);
  console.log("  Activities count:", todayActivities.length, "(expected: 2)");
  console.log("  First activity:", todayActivities[0]?.title);

  // Test 8: findNextActivity
  log("Test 8: findNextActivity");
  const nextActivityResult = findNextActivity(todayActivities, new Date("2026-05-01T08:00:00Z"));
  console.log("  Next after morning:", nextActivityResult?.next?.title, "(expected: Eiffel Tower)");
  console.log("  Time until next:", nextActivityResult?.timeUntilNext, "minutes");

  log("Context Builder Tests Complete!");
};

runTests();
