import express from "express";
import { requireAuth } from "../middleware/requireAuth";
import { createItinerary } from "../controllers/itinerary.controller";

const router = express.Router();

router.post("/:id", requireAuth, createItinerary);

export default router;
