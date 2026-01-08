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

export interface IItineraryDay {
  date: string;
  day_number: number;
  activities: IActivity[];
}

export interface IActivityLocation {
  lat: number;
  lng: number;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface IActivity {
  id: string;
  name: string;
  description?: string;
  location?: IActivityLocation;
  duration_minutes?: number;
  duration?: number | string;
  time_of_day?: "morning" | "afternoon" | "evening";
  tags?: string[];
  travel_mode?: "driving" | "walking" | "transit";
}
