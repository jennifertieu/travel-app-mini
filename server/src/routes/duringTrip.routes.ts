import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { rateLimitDuringTrip } from "../middleware/rateLimitDuringTrip.js";
import {
  getContext,
  getDecision,
  getFood,
  getMapAnnotations,
  updateActivityStatus,
  acceptSuggestion,
} from "../controllers/duringTrip.controller.js";

const router = express.Router();

// All during-trip routes require authentication
// Rate limiting applies to agent-powered endpoints (decide, food)

// POST /during-trip/context - Get current trip context
router.post("/context", requireAuth, getContext);

// POST /during-trip/decide - Get "What Now?" suggestions (rate limited)
router.post("/decide", requireAuth, rateLimitDuringTrip, getDecision);

// POST /during-trip/food - Get food recommendations (rate limited)
router.post("/food", requireAuth, rateLimitDuringTrip, getFood);

// POST /during-trip/map-intelligence - Get map annotations
router.post("/map-intelligence", requireAuth, getMapAnnotations);

// PATCH /during-trip/activity/:activityId/status - Update activity progress
router.patch("/activity/:activityId/status", requireAuth, updateActivityStatus);

// POST /during-trip/suggestions/accept - Accept a suggestion and add to itinerary
router.post("/suggestions/accept", requireAuth, acceptSuggestion);

export default router;
