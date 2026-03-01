import { Router } from "express";
import {
  generateSuggestions,
  generateSuggestionsStream,
  generateHotelSuggestionsStream,
} from "../controllers/suggestions.controller.js";

const router = Router();

router.post("/generate", generateSuggestions);
router.post("/generate/stream", generateSuggestionsStream);
router.post("/hotels/stream", generateHotelSuggestionsStream);

export default router;
