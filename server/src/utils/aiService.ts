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
  costGuess?: "$" | "$" | "$$";
  durationGuess?: "30m" | "1-2h" | "half-day";
  iconType?: string;
}

export interface TripSuggestionsInput {
  destination: string;
  durationDays: number | null;
  budgetLevel: string | null;
  interests: string[] | null;
}

export interface ActivitySuggestion {
  name: string;
  summary: string;
  category: IdeaCategory;
  costGuess: "$" | "$" | "$$";
  durationGuess: "30m" | "1-2h" | "half-day";
  placeQuery: string;
  tags: string[];
  iconType: string;
}

export interface AreaSearchInput {
  query: string;
  bounds: { north: number; south: number; east: number; west: number };
  locationName: string;
}

/**
 * Generate AI enrichment data using OpenAI
 * Extracts summary, tags, place query, and estimates from video metadata
 */
export async function generateAIEnrichment(
  input: AIEnrichmentInput,
): Promise<AIEnrichmentOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log("🤖 [AI Service] Starting OpenAI enrichment...");
  console.log("🔑 [AI Service] API Key present:", !!apiKey);
  console.log(
    "🔑 [AI Service] API Key prefix:",
    apiKey ? `${apiKey.substring(0, 10)}...` : "none",
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
      response.statusText,
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
        } - ${JSON.stringify(errorData)}`,
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
    tripDates.start,
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
  "costGuess": "$ or $ or $$ (estimated cost per person)",
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
- $ = $15-50/person (casual dining, attractions)
- $$ = over $50/person (fine dining, premium experiences)

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
function validateCostGuess(value: any): "$" | "$" | "$$" | undefined {
  if (value === "$" || value === "$" || value === "$$") {
    return value;
  }
  return undefined;
}

/**
 * Validate duration guess format
 */
function validateDurationGuess(
  value: any,
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
  maxRetries = 3,
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
        `❌ [Rate Limit] Non-retryable error on attempt ${attempt + 1}`,
      );
      throw error;
    }
  }

  console.error(`❌ [Rate Limit] Max retries (${maxRetries}) reached`);
  throw lastError || new Error("Max retries reached");
}

/**
 * Generate AI activity suggestions for a trip
 * Returns 10 diverse activity recommendations based on destination, budget, and interests
 */
export async function generateActivitySuggestions(
  input: TripSuggestionsInput,
): Promise<ActivitySuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log("🎯 [AI Suggestions] Starting activity suggestion generation...");
  console.log("📍 [AI Suggestions] Destination:", input.destination);
  console.log("📅 [AI Suggestions] Duration:", input.durationDays, "days");
  console.log(
    "💰 [AI Suggestions] Budget:",
    input.budgetLevel || "not specified",
  );
  console.log(
    "🎨 [AI Suggestions] Interests:",
    input.interests?.join(", ") || "general",
  );

  if (!apiKey) {
    console.error("❌ [AI Suggestions] OPENAI_API_KEY is not configured");
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const prompt = buildSuggestionsPrompt(input);
  console.log("📝 [AI Suggestions] Prompt built");

  try {
    console.log("🌐 [AI Suggestions] Sending request to OpenAI API...");
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
              "You are an expert travel planning assistant specializing in creating diverse, practical activity recommendations. You have deep knowledge of destinations worldwide and can suggest specific places, restaurants, attractions, and experiences that match traveler preferences. Always provide specific, actionable suggestions with real place names.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    console.log(
      "📡 [AI Suggestions] Response status:",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [AI Suggestions] OpenAI API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(
        `OpenAI API error: ${response.status} ${
          response.statusText
        } - ${JSON.stringify(errorData)}`,
      );
    }

    const data = await response.json();
    console.log("✅ [AI Suggestions] Response received from OpenAI");
    console.log("📊 [AI Suggestions] Usage:", data.usage);

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("❌ [AI Suggestions] No content in OpenAI response");
      throw new Error("No content in OpenAI response");
    }

    const parsed = JSON.parse(content);

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      console.error("❌ [AI Suggestions] Invalid response format");
      throw new Error("Invalid response format from OpenAI");
    }

    console.log(
      `✨ [AI Suggestions] Parsed ${parsed.suggestions.length} suggestions`,
    );

    const validatedSuggestions: ActivitySuggestion[] = parsed.suggestions.map(
      (suggestion: any, index: number) => {
        console.log(`   ${index + 1}. ${suggestion.name || "Unnamed"}`);
        return {
          name: suggestion.name || `Activity ${index + 1}`,
          summary: suggestion.summary || "A great travel experience.",
          category: validateCategory(suggestion.category) || "other",
          costGuess: validateCostGuess(suggestion.costGuess) || "$",
          durationGuess:
            validateDurationGuess(suggestion.durationGuess) || "1-2h",
          placeQuery:
            suggestion.placeQuery || `${suggestion.name} ${input.destination}`,
          tags: Array.isArray(suggestion.tags)
            ? suggestion.tags.slice(0, 5)
            : [],
          iconType: validateIconType(suggestion.iconType) || "attraction",
        };
      },
    );

    console.log(
      "🎉 [AI Suggestions] Activity suggestions generated successfully!",
    );
    return validatedSuggestions;
  } catch (error) {
    console.error("💥 [AI Suggestions] Error during generation:", error);
    console.error("💥 [AI Suggestions] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Build a prompt for generating activity suggestions
 */
function buildSuggestionsPrompt(input: TripSuggestionsInput): string {
  const { destination, durationDays, budgetLevel, interests } = input;

  const durationText = durationDays
    ? `${durationDays} day${durationDays !== 1 ? "s" : ""}`
    : "a few days";
  const budgetText = budgetLevel
    ? budgetLevel === "$"
      ? "budget-friendly (under $15/person)"
      : budgetLevel === "$"
        ? "moderate ($15-50/person)"
        : "premium/luxury (over $50/person)"
    : "various price ranges";
  const interestsText =
    interests && interests.length > 0 ? interests.join(", ") : "general travel";

  return `Generate 5 diverse and specific activity suggestions for a trip to ${destination} for ${durationText}.

Traveler Preferences:
- Budget: ${budgetText}
- Interests: ${interestsText}

CRITICAL REQUIREMENTS:
1. Provide SPECIFIC place names, not generic descriptions (e.g., "Pike Place Market" not "local market")
2. Mix different categories: food, sightseeing, nature, shopping, nightlife, activities
3. Include a variety of durations: quick stops, half-day activities, and longer experiences
4. Match the budget preference when possible
5. Prioritize places that align with stated interests
6. Include both popular tourist spots AND hidden gems
7. Ensure activities are actually available in ${destination}

Return EXACTLY this JSON format:
{
  "suggestions": [
    {
      "name": "Specific place or activity name",
      "summary": "2-3 sentences. What it is, why it's worth visiting, practical details like best time/what to order/key features. NO marketing fluff.",
      "category": "food|sightseeing|nature|shopping|nightlife|activity|stay|other",
      "costGuess": "$|$|$$",
      "durationGuess": "30m|1-2h|half-day",
      "placeQuery": "Specific search query for Google Places (e.g., 'Pike Place Market Seattle' or 'Ramen Ichiran Shibuya Tokyo')",
      "tags": ["tag1", "tag2", "tag3"],
      "iconType": "restaurant|cafe|bar|museum|park|beach|temple|market|hotel|shop|landmark|attraction|nature|food|activity|other"
    }
  ]
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

SUMMARY WRITING RULES:
✅ GOOD: "Traditional ramen shop famous for their tonkotsu broth. Order the original with extra noodles, open until 2am."
❌ BAD: "This unique dining experience offers an authentic atmosphere where visitors can enjoy..."

Generate 5 activities now. Make them specific, actionable, and tailored to ${destination}.`;
}

/**
 * Generate AI place suggestions for an area search query within a bounding box.
 * Returns exactly 3 specific place suggestions matching the query in the given area.
 */
export async function generateAreaSearchSuggestions(
  input: AreaSearchInput,
): Promise<ActivitySuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  console.log(
    "🔍 [Area Search AI] Starting area search suggestion generation...",
  );
  console.log("📍 [Area Search AI] Location:", input.locationName);
  console.log("🔎 [Area Search AI] Query:", input.query);
  console.log("📐 [Area Search AI] Bounds:", JSON.stringify(input.bounds));

  if (!apiKey) {
    console.error("❌ [Area Search AI] OPENAI_API_KEY is not configured");
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const prompt = buildAreaSearchPrompt(input);

  try {
    console.log("🌐 [Area Search AI] Sending request to OpenAI API...");
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
              "You are an expert travel planning assistant specializing in finding specific places within geographic areas. You have deep knowledge of restaurants, attractions, shops, and experiences worldwide. Always suggest real, specific places that actually exist in the requested area. Provide structured responses in JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    console.log(
      "📡 [Area Search AI] Response status:",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [Area Search AI] OpenAI API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      );
    }

    const data = await response.json();
    console.log("✅ [Area Search AI] Response received from OpenAI");
    console.log("📊 [Area Search AI] Usage:", data.usage);

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("❌ [Area Search AI] No content in OpenAI response");
      throw new Error("No content in OpenAI response");
    }

    const parsed = JSON.parse(content);

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      console.error("❌ [Area Search AI] Invalid response format");
      throw new Error("Invalid response format from OpenAI");
    }

    console.log(
      `✨ [Area Search AI] Parsed ${parsed.suggestions.length} suggestions`,
    );

    const validatedSuggestions: ActivitySuggestion[] = parsed.suggestions
      .slice(0, 3)
      .map((suggestion: any, index: number) => {
        console.log(`   ${index + 1}. ${suggestion.name || "Unnamed"}`);
        return {
          name: suggestion.name || `Place ${index + 1}`,
          summary: suggestion.summary || "A place worth visiting.",
          category: validateCategory(suggestion.category) || "other",
          costGuess: validateCostGuess(suggestion.costGuess) || "$",
          durationGuess:
            validateDurationGuess(suggestion.durationGuess) || "1-2h",
          placeQuery:
            suggestion.placeQuery || `${suggestion.name} ${input.locationName}`,
          tags: Array.isArray(suggestion.tags)
            ? suggestion.tags.slice(0, 5)
            : [],
          iconType: validateIconType(suggestion.iconType) || "attraction",
        };
      });

    console.log(
      "🎉 [Area Search AI] Area search suggestions generated successfully!",
    );
    return validatedSuggestions;
  } catch (error) {
    console.error("💥 [Area Search AI] Error during generation:", error);
    throw error;
  }
}

/**
 * Build a prompt for area search suggestions within a bounding box
 */
function buildAreaSearchPrompt(input: AreaSearchInput): string {
  const { query, bounds, locationName } = input;

  return `Find exactly 3 specific, real places matching "${query}" within this geographic area:

Location: ${locationName}
Bounding Box:
- North: ${bounds.north}
- South: ${bounds.south}
- East: ${bounds.east}
- West: ${bounds.west}

CRITICAL REQUIREMENTS:
1. Suggest exactly 3 REAL, SPECIFIC places that match "${query}" in or near ${locationName}
2. All suggestions must be within or very close to the bounding box coordinates above
3. Use actual business/place names, not generic descriptions
4. Each suggestion should be a distinct place (no duplicates)
5. Prioritize well-known, highly-rated places

Return EXACTLY this JSON format:
{
  "suggestions": [
    {
      "name": "Specific place name",
      "summary": "1-2 sentences. What it is and why it's worth visiting. Be specific and practical.",
      "category": "food|sightseeing|nature|shopping|nightlife|activity|stay|other",
      "costGuess": "$|$$|$$$",
      "durationGuess": "30m|1-2h|half-day",
      "placeQuery": "Exact place name + city for Google Places search (e.g., 'Ichiran Ramen Shibuya Tokyo')",
      "tags": ["${query}", "area_search", "tag3"],
      "iconType": "restaurant|cafe|bar|museum|park|beach|temple|market|hotel|shop|landmark|attraction|nature|food|activity|other"
    }
  ]
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

Generate exactly 3 suggestions now.`;
}
