import { openai } from "../config.js";

export interface IPhotoChallenge {
  description: string;
  difficulty: "easy" | "medium" | "silly";
}

export interface IPhotoTip {
  activity_name: string;
  image_url?: string;
  /** Multiple Google (Places) photos for this activity; first is used for selfie generation. */
  image_urls?: string[];
  /** Cached AI-generated selfie image (base64), when available. @deprecated Use generated_selfie_url instead. */
  generated_selfie_base64?: string;
  /** Public URL of the AI-generated selfie image hosted on Supabase Storage. */
  generated_selfie_url?: string;
  selfie_tip: string;
  pose_idea: string;
  best_time: string;
  is_group_spot: boolean;
  group_tip?: string;
  challenge?: IPhotoChallenge;
  /** Rich scene description for AI image generation: location, lighting, composition, pose, mood. */
  image_prompt?: string;
}

export interface IPoseOfTheDay {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "silly";
}

export interface IPhotoGuideData {
  pose_of_the_day: IPoseOfTheDay;
  tips: IPhotoTip[];
}

interface IActivityForPrompt {
  name: string;
  description?: string;
  time_of_day?: string;
  category?: string;
}

export const generatePhotoGuideWithAI = async (
  destination: string,
  activities: IActivityForPrompt[],
): Promise<IPhotoGuideData> => {
  const activityList = activities
    .map(
      (a) =>
        `- ${a.name}${a.description ? `: ${a.description}` : ""}${a.time_of_day ? ` (${a.time_of_day})` : ""}`,
    )
    .join("\n");

  const systemPrompt = `You are a fun travel photo guide. Generate a "Photo Guide" for one day of a trip: selfie tips, pose ideas, optional photo challenges, and a detailed image_prompt for each stop. Be specific to each place, encouraging and a bit playful. Use difficulty levels: "easy", "medium", "silly".

For image_prompt: write 2-4 sentences that describe the ideal photo a traveler would take at this spot. The description will be used by an AI image generator, so it must be concrete and visual. Include: (1) location name and setting, (2) time of day and lighting (e.g. golden morning light, sunset, night), (3) composition (e.g. wide shot with landmark in background, close-up with food), (4) what the person/group is doing (the pose or challenge), (5) mood or style (e.g. candid, vibrant colors, atmospheric). Vary the style by activity type: food spots → closer compositions with the dish or market; landmarks → establishing shots with the building/scene; nature → environmental portrait; nightlife → moody, lit by ambient light. Write as if describing a real travel photo, not an AI selfie.`;

  const userPrompt = `Destination: ${destination}

Activities for this day (in order):
${activityList}

Return a JSON object with this exact structure (no markdown, no code fence):
{
  "pose_of_the_day": {
    "title": "A short catchy challenge name (e.g. Jump Shot Challenge)",
    "description": "One sentence telling the group what to do (e.g. Everyone jump with the monument behind you!)",
    "difficulty": "easy" | "medium" | "silly"
  },
  "tips": [
    {
      "activity_name": "Exact activity name as listed above",
      "selfie_tip": "Where to stand / angle for a great selfie (1-2 sentences)",
      "pose_idea": "A specific pose suggestion (e.g. Lean on the railing, casual over-the-shoulder look)",
      "best_time": "When to get the best shot (e.g. Golden hour: 5:30-6:15pm, or Morning light, or Anytime)",
      "is_group_spot": true or false,
      "group_tip": "If is_group_spot is true, one sentence for group photo (e.g. Line up on the steps, tower centered). Omit if false.",
      "challenge": {
        "description": "Optional fun challenge at this spot (e.g. Recreate the classic holding the tower shot)",
        "difficulty": "easy" | "medium" | "silly"
      },
      "image_prompt": "A photorealistic travel photo at [location] during [lighting]. [Composition and angle]. [What the person/group is doing]. [Mood and colors]. 2-4 sentences, concrete and visual."
    }
  ]
}

Include one tip object for each activity, in the same order. Every tip must have activity_name, selfie_tip, pose_idea, best_time, is_group_spot, and image_prompt. Add group_tip only when is_group_spot is true. Add challenge only for 1-2 activities that are iconic. Each image_prompt must be unique and tailored to that activity's name, time of day, category, and pose/challenge.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content");
  }

  const parsed = JSON.parse(content) as IPhotoGuideData;

  if (!parsed.pose_of_the_day || !Array.isArray(parsed.tips)) {
    throw new Error("Invalid photo guide structure from OpenAI");
  }

  return parsed;
};
