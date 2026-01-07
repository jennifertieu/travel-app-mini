import express from "express";
import { getMemberProfile, updateMemberProfile, deleteMemberProfile } from "../controllers/memberProfiles.controller";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.get("/", requireAuth, getMemberProfile);
router.patch("/", requireAuth, updateMemberProfile);
router.delete("/", requireAuth, deleteMemberProfile);

export default router;
