import express from "express";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.post("/:id", requireAuth);

export default router;
