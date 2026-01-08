import express from "express";
import {
  getMemberProfile,
  updateMemberProfile,
  deleteMemberProfile,
} from "../controllers/memberProfiles.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.get("/", requireAuth, getMemberProfile);
router.patch("/", requireAuth, updateMemberProfile);
router.delete("/", requireAuth, deleteMemberProfile);

export default router;
