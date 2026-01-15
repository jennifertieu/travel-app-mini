import { IActivity } from "../types/interface.js";

export interface IGetActivityDetailsResult {
  name: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  duration_minutes: number;
  description?: string;
  tags?: string[];
}

export const getActivityDetails = (
  activity: IActivity
): IGetActivityDetailsResult => {
  return {
    name: activity.name,
    location: {
      lat: activity.latitude ?? 0,
      lng: activity.longitude ?? 0,
      address: activity.location?.address,
    },
    duration_minutes:
      typeof activity.duration_minutes === "number"
        ? activity.duration_minutes
        : 60,
    description: activity.description,
    tags: activity.tags,
  };
};
