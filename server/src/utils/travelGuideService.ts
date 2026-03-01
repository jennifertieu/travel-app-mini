import { OPENAI_API_KEY } from "../config.js";

// gpt-4o-mini: consistent with the rest of the server
const MODEL = "gpt-4o-mini";

export interface GuideSection {
  id: string;
  icon: string;
  title: string;
  tips: string[];
}

export interface DestinationGuide {
  destination: string;
  sections: GuideSection[];
  generated_at: string;
}

export interface ActivitySpotlight {
  activity_name: string;
  hero_photo?: string;
  editorial_blurb: string;
  insider_tips: string[];
  best_time: string;
  budget_tip: string;
  etiquette_tip?: string;
}

export interface ActivitySpotlightsGuide {
  destination: string;
  spotlights: ActivitySpotlight[];
  generated_at: string;
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const json = await res.json();
  return json.choices[0].message.content;
}

export async function generateDestinationGuide(
  destination: string,
): Promise<DestinationGuide> {
  const systemPrompt = `You are an expert travel writer crafting punchy, editorial-style travel guides.
Each tip must be 1-2 sentences max — specific, memorable, and actionable.
Focus on destination-specific etiquette, cultural quirks, and practical safety tips.
Include the kind of insider knowledge that makes travelers feel prepared and confident.
Always respond with valid JSON.`;

  const userPrompt = `Generate a travel guide for: ${destination}

Return JSON with this exact shape:
{
  "destination": "${destination}",
  "sections": [
    {
      "id": "etiquette",
      "icon": "🙏",
      "title": "Etiquette & Culture",
      "tips": ["2-3 destination-specific etiquette tips, e.g. slurping noodles in Japan is a compliment"]
    },
    {
      "id": "getting-around",
      "icon": "🚇",
      "title": "Getting Around",
      "tips": ["2-3 tips on local transport, apps, cards to get"]
    },
    {
      "id": "food",
      "icon": "🍽️",
      "title": "Food & Dining",
      "tips": ["2-3 tips on local food culture, ordering customs, must-try dishes"]
    },
    {
      "id": "safety",
      "icon": "⚠️",
      "title": "Safety & Practical",
      "tips": ["2-3 tips on common scams, tap water, SIM cards, power adapters"]
    },
    {
      "id": "money",
      "icon": "💰",
      "title": "Money Tips",
      "tips": ["2-3 tips on currency, ATMs, tipping norms, card acceptance"]
    },
    {
      "id": "best-time",
      "icon": "🌤️",
      "title": "Best Time to Visit",
      "tips": ["2 tips on seasons, festivals, when to avoid"]
    }
  ],
  "generated_at": "${new Date().toISOString()}"
}

Make every tip punchy and specific to ${destination}. No generic travel advice.`;

  const raw = await callOpenAI(systemPrompt, userPrompt);
  return JSON.parse(raw) as DestinationGuide;
}

export async function generateActivitySpotlights(
  destination: string,
  activities: Array<{
    name: string;
    description?: string;
    image_url?: string;
    place?: { photoUrl?: string };
  }>,
): Promise<ActivitySpotlightsGuide> {
  const systemPrompt = `You are a travel journalist writing editorial spotlight cards for specific activities and places.
Each spotlight should feel like a mini Lonely Planet entry — punchy, specific, and genuinely useful.
Insider tips should be the kind of thing only locals or experienced travelers know.
Etiquette tips should be destination-specific (e.g. removing shoes, tipping customs, dress codes at that specific type of venue).
Always respond with valid JSON.`;

  const activityList = activities
    .slice(0, 10) // cap at 10 for speed
    .map((a) => `- ${a.name}${a.description ? `: ${a.description}` : ""}`)
    .join("\n");

  const userPrompt = `Generate activity spotlight cards for a trip to ${destination}.

Activities:
${activityList}

Return JSON with this exact shape:
{
  "destination": "${destination}",
  "spotlights": [
    {
      "activity_name": "exact name from the list",
      "editorial_blurb": "2-3 sentence editorial description — what makes this place special, its history or vibe",
      "insider_tips": ["tip 1 — specific, actionable", "tip 2 — something most tourists miss"],
      "best_time": "1 sentence on best time of day or year to visit",
      "budget_tip": "1 sentence on cost expectations or how to save money",
      "etiquette_tip": "1 sentence on specific etiquette for this type of venue in ${destination}"
    }
  ],
  "generated_at": "${new Date().toISOString()}"
}

Make every tip hyper-specific to the actual place and ${destination} culture. No generic advice.`;

  const raw = await callOpenAI(systemPrompt, userPrompt);
  console.log(
    `[travelGuideService] Raw OpenAI spotlights response:`,
    raw.slice(0, 500),
  );
  const parsed = JSON.parse(raw) as ActivitySpotlightsGuide;
  console.log(
    `[travelGuideService] Parsed keys:`,
    Object.keys(parsed),
    `spotlights type:`,
    typeof parsed.spotlights,
    Array.isArray(parsed.spotlights)
      ? `length=${parsed.spotlights.length}`
      : "not array",
  );

  // Attach hero photos from the activity data
  for (const spotlight of parsed.spotlights) {
    const match = activities.find(
      (a) => a.name?.toLowerCase() === spotlight.activity_name?.toLowerCase(),
    );
    if (match) {
      spotlight.hero_photo = match.place?.photoUrl ?? match.image_url;
    }
  }

  return parsed;
}
