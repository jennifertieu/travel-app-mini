/**
 * Test script for the AI Itinerary Builder Agent
 *
 * Run with: cd server && npx tsx src/utils/testItineraryAgent.ts
 *
 * Options:
 *   --verbose    Show each agent iteration and tool call
 *   --tokyo      Use Tokyo test data instead of Paris
 *   --short      Use a shorter 2-day trip
 *
 * Examples:
 *   npx tsx src/utils/testItineraryAgent.ts
 *   npx tsx src/utils/testItineraryAgent.ts --verbose
 *   npx tsx src/utils/testItineraryAgent.ts --tokyo --verbose
 */

import { aiItineraryBuilderAgent } from "./aiItineraryBuilderAgent.js";

// Parse command line arguments
const args = process.argv.slice(2);
const VERBOSE = args.includes("--verbose");
const USE_TOKYO = args.includes("--tokyo");
const SHORT_TRIP = args.includes("--short");

// ============================================================================
// TEST DATA: PARIS
// ============================================================================
const parisTripData = {
  trip: {
    id: "test-trip-paris-2025",
    title: "Paris Adventure",
    destination: "Paris, France",
    start_date: SHORT_TRIP ? "2025-04-10" : "2025-04-10",
    end_date: SHORT_TRIP ? "2025-04-12" : "2025-04-13",
  },
  tripIdeas: [
    {
      id: "idea-eiffel",
      name: "Eiffel Tower Visit",
      location: "Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France",
      duration_minutes: 120,
      description:
        "Iconic iron lattice tower with panoramic views of Paris. Best visited in the evening for sunset views.",
      tags: ["landmark", "photography", "must-see"],
    },
    {
      id: "idea-louvre",
      name: "Louvre Museum",
      location: "Rue de Rivoli, 75001 Paris, France",
      duration_minutes: 240,
      description:
        "World's largest art museum housing the Mona Lisa and Venus de Milo. Requires significant time to explore.",
      tags: ["museum", "art", "culture", "indoor"],
    },
    {
      id: "idea-montmartre",
      name: "Montmartre & Sacré-Cœur",
      location: "35 Rue du Chevalier de la Barre, 75018 Paris, France",
      duration_minutes: 180,
      description:
        "Charming hilltop neighborhood with the beautiful Sacré-Cœur basilica and artist square.",
      tags: ["neighborhood", "church", "photography", "walking"],
    },
    {
      id: "idea-seine-cruise",
      name: "Seine River Cruise",
      location: "Port de la Bourdonnais, 75007 Paris, France",
      duration_minutes: 90,
      description:
        "Relaxing boat cruise along the Seine, passing major landmarks. Evening cruises offer dinner options.",
      tags: ["cruise", "relaxing", "romantic", "evening"],
    },
    {
      id: "idea-notre-dame",
      name: "Notre-Dame Cathedral Area",
      location: "6 Parvis Notre-Dame - Pl. Jean-Paul II, 75004 Paris, France",
      duration_minutes: 60,
      description:
        "Visit the area around the famous cathedral (exterior only due to restoration). Beautiful Gothic architecture.",
      tags: ["landmark", "church", "history"],
    },
    {
      id: "idea-orsay",
      name: "Musée d'Orsay",
      location: "1 Rue de la Légion d'Honneur, 75007 Paris, France",
      duration_minutes: 180,
      description:
        "Impressionist art museum in a former railway station. Home to works by Monet, Van Gogh, and Renoir.",
      tags: ["museum", "art", "impressionism", "indoor"],
    },
    {
      id: "idea-marais",
      name: "Le Marais Walking Tour",
      location: "Place des Vosges, 75004 Paris, France",
      duration_minutes: 150,
      description:
        "Historic district with trendy shops, cafes, and the oldest planned square in Paris.",
      tags: ["neighborhood", "shopping", "walking", "food"],
    },
    {
      id: "idea-versailles",
      name: "Palace of Versailles Day Trip",
      location: "Place d'Armes, 78000 Versailles, France",
      duration_minutes: 360,
      description:
        "Lavish royal palace with stunning gardens. Full day trip from Paris (30 min by train).",
      tags: ["palace", "history", "gardens", "day-trip"],
    },
  ],
};

// ============================================================================
// TEST DATA: TOKYO
// ============================================================================
const tokyoTripData = {
  trip: {
    id: "test-trip-tokyo-2025",
    title: "Tokyo Explorer",
    destination: "Tokyo, Japan",
    start_date: SHORT_TRIP ? "2025-05-01" : "2025-05-01",
    end_date: SHORT_TRIP ? "2025-05-03" : "2025-05-05",
  },
  tripIdeas: [
    {
      id: "idea-sensoji",
      name: "Senso-ji Temple",
      location: "2 Chome-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan",
      duration_minutes: 90,
      description:
        "Tokyo's oldest temple with the iconic Thunder Gate and Nakamise shopping street.",
      tags: ["temple", "culture", "shopping", "must-see"],
    },
    {
      id: "idea-shibuya",
      name: "Shibuya Crossing & Hachiko",
      location: "Shibuya Scramble Crossing, Shibuya City, Tokyo, Japan",
      duration_minutes: 60,
      description:
        "World's busiest pedestrian crossing. Visit Hachiko statue and explore the surrounding area.",
      tags: ["landmark", "photography", "shopping"],
    },
    {
      id: "idea-teamlab",
      name: "teamLab Borderless",
      location: "Azabudai Hills, Minato City, Tokyo, Japan",
      duration_minutes: 180,
      description:
        "Immersive digital art museum with stunning interactive installations.",
      tags: ["art", "museum", "photography", "indoor"],
    },
    {
      id: "idea-tsukiji",
      name: "Tsukiji Outer Market",
      location: "Tsukiji, Chuo City, Tokyo 104-0045, Japan",
      duration_minutes: 120,
      description:
        "Fresh seafood market with sushi, street food, and kitchen supplies. Best visited early morning.",
      tags: ["food", "market", "morning", "must-see"],
    },
    {
      id: "idea-meiji",
      name: "Meiji Shrine & Harajuku",
      location: "1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557, Japan",
      duration_minutes: 150,
      description:
        "Serene Shinto shrine in forested grounds, followed by quirky Harajuku fashion district.",
      tags: ["shrine", "nature", "shopping", "culture"],
    },
    {
      id: "idea-skytree",
      name: "Tokyo Skytree",
      location: "1 Chome-1-2 Oshiage, Sumida City, Tokyo 131-0045, Japan",
      duration_minutes: 90,
      description:
        "Tallest tower in Japan with observation decks and shopping mall.",
      tags: ["landmark", "views", "evening"],
    },
    {
      id: "idea-akihabara",
      name: "Akihabara Electric Town",
      location: "Akihabara, Taito City, Tokyo, Japan",
      duration_minutes: 180,
      description:
        "Electronics, anime, and gaming paradise. Multi-story arcades and maid cafes.",
      tags: ["shopping", "culture", "gaming", "unique"],
    },
    {
      id: "idea-shinjuku",
      name: "Shinjuku Golden Gai",
      location: "1 Chome Kabukicho, Shinjuku City, Tokyo 160-0021, Japan",
      duration_minutes: 120,
      description:
        "Network of narrow alleys with tiny bars. Authentic Tokyo nightlife experience.",
      tags: ["nightlife", "food", "evening", "unique"],
    },
  ],
};

// Select test data based on arguments
const mockTripData = USE_TOKYO ? tokyoTripData : parisTripData;

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================
async function runTest() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("       AI ITINERARY BUILDER AGENT - TEST RUN");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (VERBOSE) {
    console.log("🔍 VERBOSE MODE ENABLED - Showing all agent iterations\n");
  }

  console.log("📍 Trip Details:");
  console.log(`   Destination: ${mockTripData.trip.destination}`);
  console.log(
    `   Dates: ${mockTripData.trip.start_date} to ${mockTripData.trip.end_date}`
  );
  const days = Math.ceil(
    (new Date(mockTripData.trip.end_date).getTime() -
      new Date(mockTripData.trip.start_date).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  console.log(`   Duration: ${days} days`);
  console.log(`   Activities to schedule: ${mockTripData.tripIdeas.length}\n`);

  console.log("📋 Available Activities:");
  mockTripData.tripIdeas.forEach((idea, i) => {
    const hours = Math.floor(idea.duration_minutes / 60);
    const mins = idea.duration_minutes % 60;
    const durationStr =
      hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
    console.log(`   ${i + 1}. ${idea.name} (${durationStr})`);
  });

  console.log("\n🤖 Starting agent...\n");
  console.log("───────────────────────────────────────────────────────────");

  try {
    const startTime = Date.now();
    const result = await aiItineraryBuilderAgent(mockTripData, { verbose: VERBOSE });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n───────────────────────────────────────────────────────────");
    console.log(`✅ Agent completed in ${duration}s\n`);
    console.log("═══════════════════════════════════════════════════════════");
    console.log("                    FINAL ITINERARY");
    console.log("═══════════════════════════════════════════════════════════\n");

    // Try to parse and pretty-print if it's JSON
    if (typeof result === "string") {
      try {
        // Check if the result contains JSON
        const jsonMatch = result.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          console.log("📅 Structured Itinerary:\n");
          const parsed = JSON.parse(jsonMatch[1]);
          console.log(JSON.stringify(parsed, null, 2));
        } else {
          console.log(result);
        }
      } catch {
        console.log(result);
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("                    TEST COMPLETE");
    console.log("═══════════════════════════════════════════════════════════\n");
  } catch (error: any) {
    console.error("\n❌ Agent failed:", error.message);
    if (VERBOSE) {
      console.error("\nFull error:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
runTest();
