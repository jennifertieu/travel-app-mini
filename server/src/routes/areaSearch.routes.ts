import { Router } from "express";
import { areaSearchStream } from "../controllers/areaSearch.controller.js";

const router = Router();

router.post("/stream", areaSearchStream);

export default router;
