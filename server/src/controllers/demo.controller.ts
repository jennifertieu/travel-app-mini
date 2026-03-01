import { Response } from "express";
import { IAuthenticatedRequest } from "../types/interface.js";

export const checkDemoAccess = (
  request: IAuthenticatedRequest,
  response: Response,
) => {
  const whitelist = (process.env.DEMO_WHITELIST ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const email = request.user?.email?.toLowerCase() ?? "";
  const allowed = whitelist.length > 0 && whitelist.includes(email);

  response.json({ allowed });
};
