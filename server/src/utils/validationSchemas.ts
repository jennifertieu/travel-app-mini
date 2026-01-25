import { z } from "zod";

/**
 * Helper to validate request body and return typed result or error
 */
export const validateRequest = <T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return { success: false, error: errorMessage };
    }
    return { success: false, error: "Validation failed" };
  }
};

/**
 * Schema for validating Decision Agent JSON response
 */
export const decisionResponseSchema = z.object({
  options: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(["scheduled", "spontaneous", "rest"]),
      distance_km: z.number().min(0),
      time_required_minutes: z.number().min(0),
      energy_level: z.enum(["low", "medium", "high"]),
      reason: z.string(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
    })
  ),
  context_summary: z.string(),
});

export type DecisionResponseSchema = z.infer<typeof decisionResponseSchema>;

/**
 * Location request schema
 */
const locationRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_meters: z.number().min(0).optional(),
});

/**
 * Base during-trip request schema
 */
const baseDuringTripRequestSchema = z.object({
  trip_id: z.string().uuid("trip_id must be a valid UUID"),
  location: locationRequestSchema.optional(),
});

/**
 * Context request schema
 */
export const contextRequestSchema = baseDuringTripRequestSchema;

/**
 * Decide request schema
 */
export const decideRequestSchema = baseDuringTripRequestSchema;

/**
 * Food request schema
 */
export const foodRequestSchema = baseDuringTripRequestSchema;

/**
 * Map intelligence request schema
 */
export const mapIntelligenceRequestSchema = baseDuringTripRequestSchema.extend({
  viewport: z
    .object({
      ne: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
      sw: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    })
    .optional(),
});

/**
 * Activity status request schema
 */
export const activityStatusRequestSchema = z.object({
  trip_id: z.string().uuid("trip_id must be a valid UUID"),
  status: z.enum(["scheduled", "in_progress", "completed", "skipped"]),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  notes: z.string().optional(),
});

/**
 * Accept suggestion request schema
 */
export const acceptSuggestionRequestSchema = z.object({
  trip_id: z.string().uuid("trip_id must be a valid UUID"),
  suggestion: z.object({
    id: z.string(),
    title: z.string().min(1),
    type: z.enum([
      "scheduled",
      "spontaneous",
      "rest",
      "restaurant",
      "cafe",
      "quick_bite",
      "park_rest",
    ]),
    coordinates: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    distance_km: z.number().min(0).optional(),
    time_required_minutes: z.number().min(0).optional(),
    energy_level: z.enum(["low", "medium", "high"]).optional(),
    reason: z.string().optional(),
    cuisine: z.string().optional(),
    price_level: z.number().min(1).max(4).optional(),
    rating: z.number().min(0).max(5).optional(),
    photo_url: z.string().url().optional(),
    dietary_match: z.boolean().optional(),
  }),
  time_of_day: z.enum(["morning", "afternoon", "evening"]),
  duration_minutes: z.number().min(1).max(1440), // Max 24 hours
  override_conflicts: z.boolean().optional(),
  remove_conflicting_activity_ids: z.array(z.string().uuid()).optional(),
});
