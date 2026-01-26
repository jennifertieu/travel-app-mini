import { NextFunction, Response } from "express";
import { IAuthenticatedRequest } from "../types/interface.js";
import { supabase } from "../config.js";
import { verifyTripAccess } from "../utils/verifyTripAccess.js";

/**
 * Middleware to verify user has access to the trip specified in request body
 * Requires trip_id in request.body
 * Must be used after requireAuth middleware
 */
export const requireTripAccess = async (
  request: IAuthenticatedRequest,
  response: Response,
  next: NextFunction
) => {
  const { trip_id } = request.body;

  if (!trip_id) {
    return response.status(400).json({ error: "trip_id is required" });
  }

  const userId = request.user?.id;
  if (!userId) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const hasAccess = await verifyTripAccess(trip_id, userId, supabase);
  if (!hasAccess) {
    return response
      .status(403)
      .json({ error: "Not authorized for this trip" });
  }

  next();
};
