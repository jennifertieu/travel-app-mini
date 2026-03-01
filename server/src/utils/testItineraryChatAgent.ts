/**
 * Direct test of the chat agent — bypasses HTTP and auth entirely.
 * Run with: npx tsx src/utils/testItineraryChatAgent.ts
 * Delete this file after testing.
 *
 * Test cases:
 *  1.  Swap two activities
 *  2.  Remove activity (return to pool)
 *  3a. Add from pool (after freeing a slot via remove)
 *  3b. Add from pool (empty day)
 *  4.  Move activity to empty slot
 *  5.  Move activity to occupied slot
 *  6.  Multiple changes in one message
 *  7.  Chained compound changes (order-dependent)
 *  8.  Impossible: activity stated on wrong day
 *  9.  Impossible: target day out of range
 *  10. Impossible: pool is empty
 *  11. API failure (error propagation — documents known gap)
 */
import { IItinerary } from "./assignActivityToDay.js";
import { getOrCreateSession, IChatSession } from "./chatSessionManager.js";
import { streamItineraryChatAgent } from "./itineraryChatAgent.js";

const TRIP_ID = "test-trip-paris";

// ---------------------------------------------------------------------------
// Mock itinerary factory — returns a fresh deep copy each time to prevent
// cross-test mutation. Includes a Day 4 (empty) to enable "move/add to empty
// slot" cases. end_date is 2026-03-19 to cover the 4-day window.
// ---------------------------------------------------------------------------
const createMockItinerary = (): IItinerary => ({
  trip_id: TRIP_ID,
  trip_title: "Trip to Paris",
  destination: "Paris, France",
  start_date: "2026-03-15",
  end_date: "2026-03-19",
  days: [
    {
      date: "2026-03-15",
      day_number: 1,
      activities: [
        { id: "act-eiffel", title: "Eiffel Tower", name: "Eiffel Tower", time_of_day: "morning", duration_minutes: 120, latitude: 48.8584, longitude: 2.2945, location: "Champ de Mars, Paris" },
        { id: "act-trocadero", title: "Trocadéro Gardens", name: "Trocadéro Gardens", time_of_day: "afternoon", duration_minutes: 90, latitude: 48.8616, longitude: 2.2886, location: "Place du Trocadéro, Paris" },
        { id: "act-seine", title: "Seine River Cruise", name: "Seine River Cruise", time_of_day: "evening", duration_minutes: 90, latitude: 48.8606, longitude: 2.3376, location: "Pont Neuf, Paris" },
      ],
    },
    {
      date: "2026-03-16",
      day_number: 2,
      activities: [
        { id: "act-louvre", title: "Louvre Museum", name: "Louvre Museum", time_of_day: "morning", duration_minutes: 180, latitude: 48.8606, longitude: 2.3376, location: "Rue de Rivoli, Paris" },
        { id: "act-notredame", title: "Notre-Dame Cathedral", name: "Notre-Dame Cathedral", time_of_day: "afternoon", duration_minutes: 60, latitude: 48.853, longitude: 2.3499, location: "Île de la Cité, Paris" },
        { id: "act-marais", title: "Le Marais District", name: "Le Marais District", time_of_day: "evening", duration_minutes: 120, latitude: 48.8566, longitude: 2.3522, location: "Le Marais, Paris" },
      ],
    },
    {
      date: "2026-03-17",
      day_number: 3,
      activities: [
        { id: "act-montmartre", title: "Montmartre & Sacré-Cœur", name: "Montmartre & Sacré-Cœur", time_of_day: "morning", duration_minutes: 150, latitude: 48.8867, longitude: 2.3431, location: "Montmartre, Paris" },
        { id: "act-orsay", title: "Musée d'Orsay", name: "Musée d'Orsay", time_of_day: "afternoon", duration_minutes: 120, latitude: 48.86, longitude: 2.3266, location: "1 Rue de la Légion d'Honneur, Paris" },
        { id: "act-champselysees", title: "Champs-Élysées & Arc de Triomphe", name: "Champs-Élysées & Arc de Triomphe", time_of_day: "evening", duration_minutes: 90, latitude: 48.8738, longitude: 2.295, location: "Champs-Élysées, Paris" },
      ],
    },
    {
      date: "2026-03-18",
      day_number: 4,
      activities: [], // intentionally empty — used for "move/add to empty slot" tests
    },
  ],
  activities_pool: [
    { id: "act-versailles", title: "Palace of Versailles", name: "Palace of Versailles", duration_minutes: 240, latitude: 48.8049, longitude: 2.1204, location: "Versailles, France" },
  ],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const printItinerary = (label: string, itinerary: IItinerary) => {
  console.log(`\n--- ${label} ---`);
  for (const day of itinerary.days) {
    const acts = day.activities.length
      ? day.activities.map((a) => `  [${a.time_of_day || "unset"}] ${a.title || a.name}`).join("\n")
      : "  (empty)";
    console.log(`Day ${day.day_number} (${day.date}):\n${acts}`);
  }
  if (itinerary.activities_pool.length > 0) {
    console.log("Pool:", itinerary.activities_pool.map((a) => a.title || a.name).join(", "));
  } else {
    console.log("Pool: (empty)");
  }
};

const createSession = async (userId: string): Promise<IChatSession> => {
  return getOrCreateSession(TRIP_ID, userId, async () => createMockItinerary());
};

const sendMessage = async (session: IChatSession, userMessage: string) => {
  console.log(`\nYou: ${userMessage}\n`);
  process.stdout.write("Agent: ");

  const emitter = (event: string, data: any) => {
    if (event === "text") {
      process.stdout.write(data.content);
    } else if (event === "done") {
      process.stdout.write("\n");
    } else {
      console.log(`\n[${event}]`, JSON.stringify(data, null, 2));
    }
  };

  await streamItineraryChatAgent(session, userMessage, emitter);
};

const separator = (title: string) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST: ${title}`);
  console.log("=".repeat(60));
};

// ---------------------------------------------------------------------------
// Test 1: Swap two activities
// ---------------------------------------------------------------------------
const test1Swap = async () => {
  separator("1 — Swap two activities");
  const session = await createSession("test-user-swap");
  printItinerary("Before", session.draftItinerary);
  await sendMessage(session, "Swap the Eiffel Tower and the Trocadéro Gardens");
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 2: Remove activity (return to pool)
// ---------------------------------------------------------------------------
const test2Remove = async () => {
  separator("2 — Remove activity (return to pool)");
  const session = await createSession("test-user-remove");
  printItinerary("Before", session.draftItinerary);
  await sendMessage(session, "Remove the Seine River Cruise and keep it available for later");
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 3a: Add from pool (after freeing a slot — multi-turn conversation)
// ---------------------------------------------------------------------------
const test3aAddFromPoolFreedSlot = async () => {
  separator("3a — Add from pool (free a slot first, then assign)");
  const session = await createSession("test-user-add-pool-freed");
  printItinerary("Before", session.draftItinerary);

  await sendMessage(session, "Remove the Seine River Cruise from day 1 and keep it available for later");
  console.log("\n[After turn 1 — Seine should be in pool]");
  printItinerary("After turn 1", session.draftItinerary);

  await sendMessage(session, "Add the Palace of Versailles to day 1 evening");
  printItinerary("After turn 2", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 3b: Add from pool (Day 4 is empty — no displacement needed)
// ---------------------------------------------------------------------------
const test3bAddFromPoolEmptyDay = async () => {
  separator("3b — Add from pool (empty day 4)");
  const session = await createSession("test-user-add-pool-empty-day");
  printItinerary("Before", session.draftItinerary);
  await sendMessage(session, "Add the Palace of Versailles to day 4 morning");
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 4: Move activity to empty slot
// ---------------------------------------------------------------------------
const test4MoveToEmptySlot = async () => {
  separator("4 — Move activity to empty slot");
  const session = await createSession("test-user-move-empty");
  printItinerary("Before", session.draftItinerary);
  await sendMessage(session, "Move the Louvre Museum to day 4 morning");
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 5: Move activity to occupied slot
// ---------------------------------------------------------------------------
const test5MoveToOccupiedSlot = async () => {
  separator("5 — Move activity to occupied slot");
  const session = await createSession("test-user-move-occupied");
  printItinerary("Before", session.draftItinerary);
  await sendMessage(session, "Move the Eiffel Tower to day 2 morning");
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 6: Multiple changes in one message
// ---------------------------------------------------------------------------
const test6MultipleChanges = async () => {
  separator("6 — Multiple changes in one message");
  const session = await createSession("test-user-multi-change");
  printItinerary("Before", session.draftItinerary);
  await sendMessage(session, "Move the Eiffel Tower to day 2 morning and remove the Seine River Cruise");
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 7: Chained compound changes (order-dependent)
// ---------------------------------------------------------------------------
const test7ChainedChanges = async () => {
  separator("7 — Chained compound changes");
  const session = await createSession("test-user-chained");
  printItinerary("Before", session.draftItinerary);
  await sendMessage(
    session,
    "Swap day 1 morning and day 2 morning, then move day 3 morning to day 1 morning"
  );
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 8: Impossible — activity stated on wrong day
// ---------------------------------------------------------------------------
const test8WrongDay = async () => {
  separator("8 — Impossible: activity stated on wrong day");
  const session = await createSession("test-user-wrong-day");
  printItinerary("Before", session.draftItinerary);
  await sendMessage(session, "Move the Eiffel Tower visit on day 3 to day 1 morning");
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 9: Impossible — target day out of range
// ---------------------------------------------------------------------------
const test9DayOutOfRange = async () => {
  separator("9 — Impossible: target day out of range");
  const session = await createSession("test-user-day-range");
  printItinerary("Before", session.draftItinerary);
  await sendMessage(session, "Move the Louvre Museum to day 10");
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 10: Impossible — pool is empty
// ---------------------------------------------------------------------------
const test10EmptyPool = async () => {
  separator("10 — Impossible: pool is empty");
  const emptyPoolItinerary = createMockItinerary();
  emptyPoolItinerary.activities_pool = [];
  const session = await getOrCreateSession(
    TRIP_ID,
    "test-user-empty-pool",
    async () => emptyPoolItinerary
  );
  printItinerary("Before", session.draftItinerary);
  await sendMessage(session, "Add the Palace of Versailles to day 1 morning");
  printItinerary("After", session.draftItinerary);
};

// ---------------------------------------------------------------------------
// Test 11: API failure — error propagation (documents known gap)
// ---------------------------------------------------------------------------
const test11ApiFailure = async () => {
  separator("11 — API failure: error propagation (known gap)");

  let errorThrown = false;
  let doneEmitted = false;

  const session = await createSession("test-user-api-failure");

  const emitter = (event: string, data: any) => {
    if (event === "done") doneEmitted = true;
    if (event === "error") console.log("[error event emitted]", data);
    else if (event !== "text") console.log(`[${event}]`, JSON.stringify(data, null, 2));
    else process.stdout.write(data.content);
  };

  console.log(
    "\nNote: This test documents the CURRENT (unguarded) behavior.\n" +
    "To trigger it manually: set OPENAI_API_KEY=invalid and re-run.\n" +
    "With a valid key, the agent responds normally (not a failure test).\n"
  );

  try {
    await streamItineraryChatAgent(session, "Move the Eiffel Tower to day 2 afternoon", emitter);
  } catch (err: any) {
    errorThrown = true;
    console.log(`\n[CAUGHT THROWN ERROR] ${err.message}`);
  }

  if (errorThrown) {
    console.log("Result: function THREW (no error event emitted) — gap confirmed.");
    if (doneEmitted) {
      console.log("WARNING: 'done' was emitted before throw — unexpected.");
    }
  } else {
    console.log(
      "Result: function completed normally (valid API key). " +
      "Run with OPENAI_API_KEY=invalid to test error propagation."
    );
  }
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
const run = async () => {
  await test1Swap();
  await test2Remove();
  await test3aAddFromPoolFreedSlot();
  await test3bAddFromPoolEmptyDay();
  await test4MoveToEmptySlot();
  await test5MoveToOccupiedSlot();
  await test6MultipleChanges();
  await test7ChainedChanges();
  await test8WrongDay();
  await test9DayOutOfRange();
  await test10EmptyPool();
  await test11ApiFailure();

  console.log("\n\nAll tests complete.");
};

run().catch(console.error);
