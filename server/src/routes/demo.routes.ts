import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { checkDemoAccess } from "../controllers/demo.controller.js";

const router = express.Router();

// GET /demo/access - Check if authenticated user is whitelisted for demo mode
router.get("/access", requireAuth, checkDemoAccess);

export default router;
