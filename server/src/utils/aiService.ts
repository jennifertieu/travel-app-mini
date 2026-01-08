import { IdeaCategory } from "../types/interface.js";

interface AIEnrichmentInput {
  videoTitle: string;
  videoDescription?: string;
  videoThumbnail: string;
  platform: "tiktok" | "youtube";
  userComment?: string;
  tripDestination: string;
  tripDates: { start: Date; end: Date };
  userProfile: {
    dietary: string[];
    travelStyle: "chill" | "balanced" | "packed";
    interests: string[];
  };
}

interface AIEnrichmentOutput {
  summary: string;
  tags: string[];
  placeQuery: string;
  category?: IdeaCategory;
  costGuess?: "$" | "$$" | "$$$";
  durationGuess?: "30m" | "1-2h" | "half-day";
  iconType?: string;
}

/**
 * Generate AI enrichment data using OpenAI
 * Extracts summary, tags, place query, and estimates from video metadata
 */
export async function generateAIEnrichment(
  input: AIEnrichmentInput
): Promise<AIEnrichmentOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log("🤖 [AI Service] Starting OpenAI enrichment...");
  console.log("🔑 [AI Service] API Key present:", !!apiKey);
  console.log(
    "🔑 [AI Service] API Key prefix:",
    apiKey ? `${apiKey.substring(0, 10)}...` : "none"
  );

  if (!apiKey) {
    console.error("❌ [AI Service] OPENAI_API_KEY is not configured");
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const prompt = buildEnrichmentPrompt(input);
  console.log("📝 [AI Service] Prompt built for:", input.videoTitle);
  console.log("🎯 [AI Service] Trip destination:", input.tripDestination);

  try {
    console.log("🌐 [AI Service] Sending request to OpenAI API...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert travel planning assistant specializing in extracting precise location and place information from social media content. Your primary skill is identifying specific business names, restaurants, attractions, and locations from video titles and descriptions. Always prioritize accuracy and specificity in place identification. Provide structured responses in JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    console.log(
      "📡 [AI Service] Response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [AI Service] OpenAI API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(
        `OpenAI API error: ${response.status} ${
          response.statusText
        } - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    console.log("✅ [AI Service] Response received from OpenAI");
    console.log("📊 [AI Service] Usage:", data.usage);

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("❌ [AI Service] No content in OpenAI response");
      throw new Error("No content in OpenAI response");
    }

    console.log("📄 [AI Service] Raw content length:", content.length);

    const parsed = JSON.parse(content);
    console.log("✨ [AI Service] Parsed response:", {
      summary: parsed.summary?.substring(0, 50) + "...",
      tags: parsed.tags,
      placeQuery: parsed.placeQuery,
      category: parsed.category,
      costGuess: parsed.costGuess,
      durationGuess: parsed.durationGuess,
    });

    const result = {
      summary: parsed.summary || "A travel experience worth exploring.",
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      placeQuery: parsed.placeQuery || parsed.placeName || "travel destination",
      category: validateCategory(parsed.category),
      costGuess: validateCostGuess(parsed.costGuess),
      durationGuess: validateDurationGuess(parsed.durationGuess),
      iconType: validateIconType(parsed.iconType),
    };

    console.log("🎉 [AI Service] Enrichment complete!");
    return result;
  } catch (error) {
    console.error("💥 [AI Service] Error during enrichment:", error);
    console.error("💥 [AI Service] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Build a context-aware prompt for OpenAI
 */
function buildEnrichmentPrompt(input: AIEnrichmentInput): string {
  const {
    videoTitle,
    videoDescription,
    platform,
    userComment,
    tripDestination,
    tripDates,
    userProfile,
  } = input;

  const dateRange = `${new Date(
    tripDates.start
  ).toLocaleDateString()} to ${new Date(tripDates.end).toLocaleDateString()}`;
  const dietary =
    userProfile.dietary.length > 0 ? userProfile.dietary.join(", ") : "none";
  const interests =
    userProfile.interests.length > 0
      ? userProfile.interests.join(", ")
      : "general";

  return `You are a travel planning expert analyzing a ${platform} video for a trip to ${tripDestination} (${dateRange}).

Video Title: "${videoTitle}"
${videoDescription ? `Video Description: "${videoDescription}"` : ""}
${userComment ? `User Comment: "${userComment}"` : ""}

Traveler Profile:
- Travel Style: ${userProfile.travelStyle}
- Dietary Restrictions: ${dietary}
- Interests: ${interests}

CRITICAL: Your primary goal is to extract the EXACT place/business name and location from the video content.

Extract the following information in JSON format:
{
  "summary": "1-2 sentences. Start with WHAT it is, then WHY it's worth visiting. Be specific and actionable. NO fluff words like 'unique', 'offers', 'experience', 'atmosphere'.",
  "tags": ["array", "of", "3-5", "relevant", "tags", "matching", "traveler interests"],
  "placeQuery": "The MOST SPECIFIC place/business name with location (e.g., 'Ichiran Ramen Shibuya Tokyo' or 'Eiffel Tower Champ de Mars Paris')",
  "category": "ONE of: food, sightseeing, nature, shopping, nightlife, activity, stay, other",
  "costGuess": "$ or $$ or $$$ (estimated cost per person)",
  "durationGuess": "30m or 1-2h or half-day (estimated time needed)",
  "iconType": "single word category from: cafe, restaurant, bar, museum, park, beach, temple, market, hotel, shop, landmark, attraction, nature, food, activity, or other"
}

CATEGORY RULES:
- food: restaurants, cafes, street food, bakeries, food markets
- sightseeing: museums, temples, landmarks, historical sites, viewpoints
- nature: parks, beaches, hiking trails, gardens, waterfalls
- shopping: markets, malls, shops, boutiques
- nightlife: bars, clubs, night markets, evening entertainment
- activity: tours, experiences, classes, sports, entertainment
- stay: hotels, hostels, unique accommodations
- other: anything that doesn't fit above

SUMMARY WRITING RULES (CRITICAL):
❌ BAD: "This travel experience offers a unique café setting where visitors can enjoy..."
✅ GOOD: "Hidden garden café with floating tables over koi fish ponds. Instagram-worthy spot with Vietnamese coffee and dry-feet seating."

❌ BAD: "A serene and picturesque atmosphere that combines relaxation..."
✅ GOOD: "Rooftop bar with 360° city views. Best sunset spot in District 1, craft cocktails $8-12."

Format: [WHAT IT IS]. [KEY FEATURE/BENEFIT]. [PRACTICAL DETAIL].
- Lead with the actual thing (café, restaurant, temple, market)
- Include standout features (koi ponds, rooftop, street food)
- Add practical info (price range, best time, what to order)
- NO marketing speak or filler words
- Write like you're texting a friend a recommendation

PLACE EXTRACTION RULES (CRITICAL):
1. If a business/restaurant/attraction name is mentioned → use it exactly with the city
2. If only a neighborhood/area is mentioned → use "area name + ${tripDestination}" (e.g., "Shibuya Tokyo")
3. If only a type of place is mentioned → use "type + ${tripDestination}" (e.g., "ramen restaurant Tokyo")
4. ALWAYS include the city name in placeQuery for better matching
5. Look for location clues in hashtags, emojis, and context
6. Make your best educated guess - never return generic terms like "travel destination"

EXAMPLES:
- "Best ramen at Ichiran 🍜 #shibuya" → "Ichiran Ramen Shibuya Tokyo"
- "Hidden café in District 1" → "café District 1 Ho Chi Minh"
- "Amazing street food here!" → "street food ${tripDestination}"

Cost Guidelines:
- $ = under $15/person (street food, casual)
- $$ = $15-50/person (casual dining, attractions)
- $$$ = over $50/person (fine dining, premium experiences)

Duration Guidelines based on travel style:
- 30m = quick stops, photo ops, street food
- 1-2h = casual dining, small attractions, shopping
- half-day = major attractions, experiences, fine dining

Generate tags that match the traveler's interests: ${interests}`;
}

/**
 * Validate category format
 */
function validateCategory(value: any): IdeaCategory | undefined {
  const validCategories: IdeaCategory[] = [
    "food",
    "sightseeing",
    "nature",
    "shopping",
    "nightlife",
    "activity",
    "stay",
    "other",
  ];
  if (validCategories.includes(value)) {
    return value as IdeaCategory;
  }
  return undefined;
}

/**
 * Validate cost guess format
 */
function validateCostGuess(value: any): "$" | "$$" | "$$$" | undefined {
  if (value === "$" || value === "$$" || value === "$$$") {
    return value;
  }
  return undefined;
}

/**
 * Validate duration guess format
 */
function validateDurationGuess(
  value: any
): "30m" | "1-2h" | "half-day" | undefined {
  if (value === "30m" || value === "1-2h" || value === "half-day") {
    return value;
  }
  return undefined;
}

/**
 * Validate icon type format
 */
function validateIconType(value: any): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim().toLowerCase();
  }
  return undefined;
}

/**
 * Handle rate limiting with exponential backoff
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 [Rate Limit] Attempt ${attempt + 1}/${maxRetries}`);
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (
        error.message?.includes("429") ||
        error.message?.includes("rate limit")
      ) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ [Rate Limit] Rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.error(
        `❌ [Rate Limit] Non-retryable error on attempt ${attempt + 1}`
      );
      throw error;
    }
  }

  console.error(`❌ [Rate Limit] Max retries (${maxRetries}) reached`);
  throw lastError || new Error("Max retries reached");
}
