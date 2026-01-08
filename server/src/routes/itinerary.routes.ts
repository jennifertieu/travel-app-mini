import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { createItinerary } from "../controllers/itinerary.controller.js";

const router = express.Router();

router.post("/:id", requireAuth, createItinerary);

export default router;
