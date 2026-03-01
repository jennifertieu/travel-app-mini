import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { rateLimitDuringTrip } from "../middleware/rateLimitDuringTrip.js";
import { requireTripAccess } from "../middleware/requireTripAccess.js";
import {
  getContext,
  getDecision,
  getFood,
  getMapAnnotations,
  updateActivityStatus,
  acceptSuggestion,
  chat,
} from "../controllers/duringTrip.controller.js";

const router = express.Router();

// All during-trip routes require authentication
// Rate limiting applies to agent-powered endpoints (decide, food)

// POST /during-trip/context - Get current trip context
router.post("/context", requireAuth, requireTripAccess, getContext);

// POST /during-trip/decide - Get "What Now?" suggestions (rate limited)
router.post("/decide", requireAuth, requireTripAccess, rateLimitDuringTrip, getDecision);

// POST /during-trip/food - Get food recommendations (rate limited)
router.post("/food", requireAuth, requireTripAccess, rateLimitDuringTrip, getFood);

// POST /during-trip/map-intelligence - Get map annotations
router.post("/map-intelligence", requireAuth, requireTripAccess, getMapAnnotations);

// PATCH /during-trip/activity/:activityId/status - Update activity progress
router.patch("/activity/:activityId/status", requireAuth, requireTripAccess, updateActivityStatus);

// POST /during-trip/chat - Conversational AI chat (rate limited)
router.post("/chat", requireAuth, requireTripAccess, rateLimitDuringTrip, chat);

// POST /during-trip/suggestions/accept - Accept a suggestion and add to itinerary
router.post("/suggestions/accept", requireAuth, requireTripAccess, acceptSuggestion);

export default router;
