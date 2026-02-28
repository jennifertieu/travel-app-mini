import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createItinerary,
  recalculateBudget,
} from "../controllers/itinerary.controller.js";
import {
  chatWithAgent,
  confirmChanges,
  rejectChanges,
  getSessionStatus,
} from "../controllers/itineraryChat.controller.js";

const router = express.Router();

router.post("/:id", requireAuth, createItinerary);
router.post("/:id/recalculate-budget", requireAuth, recalculateBudget);

// Chat agent routes (must come after /:id since Express matches top-down)
router.post("/:id/chat", requireAuth, chatWithAgent);
router.post("/:id/chat/confirm", requireAuth, confirmChanges);
router.post("/:id/chat/reject", requireAuth, rejectChanges);
router.get("/:id/chat/session", requireAuth, getSessionStatus);

export default router;
