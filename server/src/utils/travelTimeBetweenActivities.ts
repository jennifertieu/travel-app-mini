import { GOOGLE_MAPS_API_KEY } from "../config.js";

export type TravelMode = "driving" | "walking" | "transit";

export interface IActivityLocation {
  latitude: number;
  longitude: number;
}

export const travelTimeBetweenActivities = async (
  from: IActivityLocation,
  to: IActivityLocation,
  mode: TravelMode = "walking"
) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from.latitude},${from.longitude}&destinations=${to.latitude},${to.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=${mode}`;
    const response = await fetch(url);
    if (!response.ok) {
      return {
        error: `Google Maps API error: ${response.status} ${response.statusText}`,
      };
    }
    const data = await response.json();

    const duration = data?.rows?.[0]?.elements?.[0]?.duration?.value;
    if (typeof duration === "number") {
      return { minutes: Math.round(duration / 60) };
    } else {
      return { error: "No travel time found for these locations." };
    }
  } catch (err: any) {
    return { error: `Failed to fetch travel time: ${err.message}` };
  }
};
