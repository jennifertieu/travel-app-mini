import { ITripIdea } from "../types/interface.js";
import { aiItineraryBuilderAgent } from "./aiItineraryBuilderAgent.js";

// Mock trip data - 5 day trip through Southern France
const mockTrip = {
  id: "mock-trip-id",
  title: "Southern France Adventure",
  destination: "France",
  start_date: "2026-05-01",
  end_date: "2026-05-05",
};

/**
 * Test Data Design:
 *
 * 3 City Clusters connected by train (~2h between each):
 * - Paris (4 activities) - Day 1-2
 * - Lyon (3 activities) - Day 3
 * - Marseille (3 activities) - Day 4-5
 *
 * Testing scenarios:
 * 1. Within-city optimization: Activities are NOT ordered optimally in the array.
 *    The AI should figure out the best walking sequence.
 * 2. Cross-city travel: AI should add "Travel to X" segments between cities.
 * 3. Time slot conflicts: Two "morning" activities in Paris - AI must choose.
 * 4. Duration variety: Mix of 1h, 2h, 3h activities.
 *
 * Paris cluster walkability (optimal order would be):
 *   Trocadéro (3min) → Eiffel Tower (25min) → Champs-Élysées (15min) → Louvre
 *   But array order is: Eiffel → Louvre → Champs-Élysées → Trocadéro
 */

const mockIdeas: ITripIdea[] = [
  // ============================================
  // PARIS CLUSTER (4 activities)
  // Intentionally NOT in optimal walking order
  // ============================================
  {
    id: "paris-1",
    trip_id: "mock-trip-id",
    title: "Eiffel Tower",
    summary: "Visit the iconic iron tower and enjoy panoramic views of Paris",
    location: "Eiffel Tower, Paris, France",
    latitude: 48.8584,
    longitude: 2.2945,
    time_of_day: "morning", // CONFLICT: Another morning activity exists
    duration_bucket: "2h",
    cost_bucket: "$$",
    category: "sightseeing",
    tags: ["landmark", "views", "iconic"],
  },
  {
    id: "paris-2",
    trip_id: "mock-trip-id",
    title: "Louvre Museum",
    summary: "Explore the world's largest art museum and see the Mona Lisa",
    location: "Louvre Museum, Paris, France",
    latitude: 48.8606,
    longitude: 2.3376,
    time_of_day: "afternoon",
    duration_bucket: "3h", // Long activity
    cost_bucket: "$$",
    category: "sightseeing",
    tags: ["museum", "art", "history"],
  },
  {
    id: "paris-3",
    trip_id: "mock-trip-id",
    title: "Champs-Élysées & Arc de Triomphe",
    summary: "Stroll down the famous avenue and climb the Arc de Triomphe",
    location: "Champs-Élysées, Paris, France",
    latitude: 48.8738,
    longitude: 2.295,
    time_of_day: "afternoon",
    duration_bucket: "2h",
    cost_bucket: "$",
    category: "sightseeing",
    tags: ["shopping", "landmark", "walking"],
  },
  {
    id: "paris-4",
    trip_id: "mock-trip-id",
    title: "Trocadéro Gardens",
    summary: "Best photo spot for Eiffel Tower views, beautiful fountains",
    location: "Trocadéro, Paris, France",
    latitude: 48.8616,
    longitude: 2.2892,
    time_of_day: "morning", // CONFLICT: Same as Eiffel Tower
    duration_bucket: "1h", // Quick activity
    cost_bucket: "$",
    category: "sightseeing",
    tags: ["gardens", "photos", "views"],
  },

  // ============================================
  // LYON CLUSTER (3 activities)
  // ~2h train from Paris
  // Walkable old town area
  // ============================================
  {
    id: "lyon-1",
    trip_id: "mock-trip-id",
    title: "Basilica of Notre-Dame de Fourvière",
    summary: "Stunning hilltop basilica with panoramic city views",
    location: "Fourvière, Lyon, France",
    latitude: 45.7622,
    longitude: 4.8224,
    time_of_day: "morning",
    duration_bucket: "2h",
    cost_bucket: "$",
    category: "sightseeing",
    tags: ["basilica", "views", "historic"],
  },
  {
    id: "lyon-2",
    trip_id: "mock-trip-id",
    title: "Vieux Lyon (Old Town)",
    summary: "Wander through Renaissance-era streets and traboules passages",
    location: "Vieux Lyon, Lyon, France",
    latitude: 45.762,
    longitude: 4.8271,
    time_of_day: "afternoon",
    duration_bucket: "2h",
    cost_bucket: "$",
    category: "sightseeing",
    tags: ["historic", "walking", "architecture"],
  },
  {
    id: "lyon-3",
    trip_id: "mock-trip-id",
    title: "Les Halles de Lyon Paul Bocuse",
    summary:
      "Famous food market - taste local cheeses, charcuterie, and pastries",
    location: "Les Halles, Lyon, France",
    latitude: 45.763,
    longitude: 4.852,
    time_of_day: "morning",
    duration_bucket: "1h",
    cost_bucket: "$$",
    category: "food",
    tags: ["food", "market", "local"],
  },

  // ============================================
  // MARSEILLE CLUSTER (3 activities)
  // ~1.5h train from Lyon
  // Port area cluster
  // ============================================
  {
    id: "marseille-1",
    trip_id: "mock-trip-id",
    title: "Vieux-Port (Old Port)",
    summary: "Historic harbor with fish market, cafes, and boat tours",
    location: "Vieux-Port, Marseille, France",
    latitude: 43.2951,
    longitude: 5.3745,
    time_of_day: "morning",
    duration_bucket: "2h",
    cost_bucket: "$",
    category: "sightseeing",
    tags: ["port", "seafood", "historic"],
  },
  {
    id: "marseille-2",
    trip_id: "mock-trip-id",
    title: "Le Panier (Old Quarter)",
    summary:
      "Oldest neighborhood in Marseille with colorful streets and artisan shops",
    location: "Le Panier, Marseille, France",
    latitude: 43.2984,
    longitude: 5.3687,
    time_of_day: "afternoon",
    duration_bucket: "2h",
    cost_bucket: "$",
    category: "sightseeing",
    tags: ["historic", "art", "walking"],
  },
  {
    id: "marseille-3",
    trip_id: "mock-trip-id",
    title: "Notre-Dame de la Garde",
    summary: "Iconic hilltop basilica with best views of Marseille and the sea",
    location: "Notre-Dame de la Garde, Marseille, France",
    latitude: 43.2838,
    longitude: 5.3714,
    time_of_day: "evening",
    duration_bucket: "2h",
    cost_bucket: "$",
    category: "sightseeing",
    tags: ["basilica", "views", "sunset"],
  },
];

function printTestOverview() {
  console.log("\n" + "=".repeat(60));
  console.log("TEST: AI Itinerary Builder - Travel Segments & Clustering");
  console.log("=".repeat(60));

  console.log("\n📍 CITY CLUSTERS:");
  console.log("─".repeat(40));

  const clusters = {
    Paris: mockIdeas.filter((i) => i.id.startsWith("paris")),
    Lyon: mockIdeas.filter((i) => i.id.startsWith("lyon")),
    Marseille: mockIdeas.filter((i) => i.id.startsWith("marseille")),
  };

  for (const [city, activities] of Object.entries(clusters)) {
    console.log(`\n${city} (${activities.length} activities):`);
    activities.forEach((a) => {
      console.log(`  • ${a.title} [${a.time_of_day}, ${a.duration_bucket}]`);
      console.log(
        `    └─ https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`,
      );
    });
  }

  console.log("\n🧪 TEST SCENARIOS:");
  console.log("─".repeat(40));
  console.log(
    "1. Within-city optimization: Should NOT schedule Paris→Lyon→Paris in one day",
  );
  console.log(
    "2. Walking priority: Nearby activities should be grouped without travel segments",
  );
  console.log(
    "3. Travel segments: Should add 'Travel to Lyon' and 'Travel to Marseille'",
  );
  console.log(
    "4. Time conflicts: Two morning activities in Paris (Eiffel + Trocadéro)",
  );
  console.log(
    "5. Optimal ordering: Trocadéro→Eiffel→Champs→Louvre is better than array order",
  );
}

function formatItineraryOutput(result: any) {
  console.log("\n" + "=".repeat(60));
  console.log("📅 GENERATED ITINERARY");
  console.log("=".repeat(60));

  if (typeof result === "string") {
    // AI returned a string response
    console.log(result);
    return;
  }

  if (result.days) {
    result.days.forEach((day: any) => {
      console.log(`\n📆 Day ${day.day_number} (${day.date})`);
      console.log("─".repeat(40));

      if (day.activities.length === 0) {
        console.log("  (No activities scheduled)");
        return;
      }

      // Sort by time slot for display
      const timeOrder = { morning: 1, afternoon: 2, evening: 3 };
      const sorted = [...day.activities].sort(
        (a: any, b: any) =>
          (timeOrder[a.time_of_day as keyof typeof timeOrder] || 4) -
          (timeOrder[b.time_of_day as keyof typeof timeOrder] || 4),
      );

      sorted.forEach((activity: any) => {
        const isTravelSegment = activity.type === "travel";
        const isOpenSlot = activity.type === "open_slot";
        const icon = isTravelSegment ? "🚆" : isOpenSlot ? "🕐" : "📍";
        const timeSlot = activity.time_of_day?.toUpperCase() || "???";

        console.log(
          `  ${icon} [${timeSlot}] ${activity.title || activity.name}`,
        );
        if (activity.description) {
          console.log(`      └─ ${activity.description}`);
        }
        if (activity.location && !isTravelSegment) {
          console.log(`      └─ ${activity.location}`);
        }
      });
    });
  } else {
    console.log("Unexpected result format:");
    console.log(JSON.stringify(result, null, 2));
  }

  // Show unassigned activities if any
  if (result.unassigned_activities && result.unassigned_activities.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("⚠️  UNASSIGNED ACTIVITIES");
    console.log("=".repeat(60));
    console.log("The following activities could not fit in the itinerary:\n");
    result.unassigned_activities.forEach((activity: any) => {
      console.log(`  • ${activity.title || activity.name}`);
      console.log(`    └─ ${activity.location}`);
    });
  }
}

async function main() {
  printTestOverview();

  console.log("\n" + "=".repeat(60));
  console.log("🤖 AI AGENT EXECUTION LOG");
  console.log("=".repeat(60));

  const result = await aiItineraryBuilderAgent(
    {
      trip: mockTrip,
      tripIdeas: mockIdeas,
    },
    (msg: string) => {
      // Format tool calls nicely
      if (msg.includes("Calling tool:")) {
        console.log("\n" + msg);
      } else if (msg.includes("result:")) {
        // Truncate long results for readability
        const truncated =
          msg.length > 200 ? msg.substring(0, 200) + "..." : msg;
        console.log(truncated);
      } else {
        console.log(msg);
      }
    },
  );

  formatItineraryOutput(result);

  console.log("\n" + "=".repeat(60));
  console.log("✅ TEST COMPLETE");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:");
  console.error(err);
});
