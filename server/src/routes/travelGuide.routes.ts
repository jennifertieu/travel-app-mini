import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getOrCreateDestinationGuide,
  getOrCreateSpotlightsGuide,
  regenerateGuide,
} from "../controllers/travelGuide.controller.js";

const router = express.Router();

router.post("/:tripId/destination", requireAuth, getOrCreateDestinationGuide);
router.post("/:tripId/spotlights", requireAuth, getOrCreateSpotlightsGuide);
router.post("/:tripId/regenerate/:guideType", requireAuth, regenerateGuide);

export default router;
