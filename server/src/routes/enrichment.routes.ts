import express from "express";
import { enrich } from "../controllers/enrichment.controller.js";

const router = express.Router();

router.post("/", enrich);

export default router;
