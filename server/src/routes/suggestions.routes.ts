import { Router } from "express";
import { generateSuggestions } from "../controllers/suggestions.controller.js";

const router = Router();

router.post("/generate", generateSuggestions);

export default router;
