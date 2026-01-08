import { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase.js";
import { IAuthenticatedRequest } from "../types/interface.js";

export const requireAuth = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return response.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return response.status(401).json({ error: "Invalid or expired token" });
  }

  (request as IAuthenticatedRequest).user = user;
  next();
};
