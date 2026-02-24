import express from "express";
import {
  searchNearbyPlaces,
  getPlaceDetails,
} from "../controllers/places.controller.js";

const router = express.Router();

// POST /places/search - Search for nearby places
router.post("/search", searchNearbyPlaces);

// POST /places/details - Get detailed info about a specific place
router.post("/details", getPlaceDetails);

export default router;
