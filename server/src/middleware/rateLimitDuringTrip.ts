import { NextFunction, Response } from "express";
import { IAuthenticatedRequest } from "../types/interface.js";
import { DURING_TRIP_RATE_LIMIT } from "../config.js";

// In-memory rate limit store (per user, per day)
// In production, this should use Redis or similar
const rateLimitStore = new Map<
  string,
  { count: number; resetTime: number }
>();

/**
 * Get the start of the current day in milliseconds
 */
const getDayStart = (): number => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

/**
 * Rate limiting middleware for during-trip endpoints
 * Limits requests per user per day
 */
export const rateLimitDuringTrip = (
  request: IAuthenticatedRequest,
  response: Response,
  next: NextFunction
) => {
  const userId = request.user?.id;

  if (!userId) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const dayStart = getDayStart();
  const key = `${userId}:${dayStart}`;

  let rateLimit = rateLimitStore.get(key);

  // Clean up old entries and initialize if needed
  if (!rateLimit || rateLimit.resetTime < dayStart) {
    rateLimit = {
      count: 0,
      resetTime: dayStart + 24 * 60 * 60 * 1000, // Reset at end of day
    };
    rateLimitStore.set(key, rateLimit);
  }

  // Check if rate limit exceeded
  if (rateLimit.count >= DURING_TRIP_RATE_LIMIT) {
    const resetTimeISO = new Date(rateLimit.resetTime).toISOString();
    return response.status(429).json({
      error: "Rate limit exceeded",
      details: `Maximum ${DURING_TRIP_RATE_LIMIT} requests per day. Resets at ${resetTimeISO}`,
      reset_time: resetTimeISO,
    });
  }

  // Increment count
  rateLimit.count++;
  rateLimitStore.set(key, rateLimit);

  // Add rate limit headers
  response.setHeader("X-RateLimit-Limit", DURING_TRIP_RATE_LIMIT.toString());
  response.setHeader(
    "X-RateLimit-Remaining",
    (DURING_TRIP_RATE_LIMIT - rateLimit.count).toString()
  );
  response.setHeader("X-RateLimit-Reset", rateLimit.resetTime.toString());

  next();
};

/**
 * Clean up old rate limit entries (run periodically)
 */
export const cleanupRateLimitStore = (): void => {
  const dayStart = getDayStart();

  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < dayStart) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupRateLimitStore, 60 * 60 * 1000);
