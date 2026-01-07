import { User } from "@supabase/supabase-js";
import { Request } from "express";

export interface IAuthenticatedRequest extends Request {
  user?: User;
}

export interface IUpdateMemberProfile {
  display_name?: string;
  dietary?: string[];
  travel_style?: string;
  interests?: string[];
  walking_tolerance?: string;
}
