import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createItinerary,
  recalculateBudget,
  selectFlight,
  regenerateFlights,
} from "../controllers/itinerary.controller.js";
import {
  chatWithAgent,
  confirmChanges,
  rejectChanges,
  getSessionStatus,
  clearChatSession,
} from "../controllers/itineraryChat.controller.js";

const router = express.Router();

router.post("/:id", requireAuth, createItinerary);
router.post("/:id/recalculate-budget", requireAuth, recalculateBudget);
router.patch("/:id/flights/select", requireAuth, selectFlight);
router.post("/:id/flights/regenerate", requireAuth, regenerateFlights);

// Chat agent routes (must come after /:id since Express matches top-down)
router.post("/:id/chat", requireAuth, chatWithAgent);
router.post("/:id/chat/confirm", requireAuth, confirmChanges);
router.post("/:id/chat/reject", requireAuth, rejectChanges);
router.get("/:id/chat/session", requireAuth, getSessionStatus);
router.delete("/:id/chat/session", requireAuth, clearChatSession);

export default router;
