import { Router } from "express";
import {
  generateSuggestions,
  generateSuggestionsStream,
} from "../controllers/suggestions.controller.js";

const router = Router();

router.post("/generate", generateSuggestions);
router.post("/generate/stream", generateSuggestionsStream);

export default router;
