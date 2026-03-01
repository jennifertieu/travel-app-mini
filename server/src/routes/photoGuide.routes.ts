import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getOrCreatePhotoGuide,
  generateSelfie,
  generateAllPhotoGuides,
} from "../controllers/photoGuide.controller.js";

const router = express.Router();

router.post("/:tripId", requireAuth, getOrCreatePhotoGuide);
router.post("/:tripId/generate-all", requireAuth, generateAllPhotoGuides);
router.post("/:tripId/generate-selfie", requireAuth, generateSelfie);

export default router;
