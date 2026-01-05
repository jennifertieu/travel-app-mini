import { User } from "@supabase/supabase-js";
import { Request } from "express";

export interface IAuthenticatedRequest extends Request {
  user: User;
}
