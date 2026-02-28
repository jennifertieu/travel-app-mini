import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createItinerary,
  recalculateBudget,
} from "../controllers/itinerary.controller.js";

const router = express.Router();

router.post("/:id", requireAuth, createItinerary);
router.post("/:id/recalculate-budget", requireAuth, recalculateBudget);

export default router;
