export type RemoteKeys = "mf_itinerary/App";
type PackageType<T> = T extends "mf_itinerary/App"
  ? typeof import("mf_itinerary/App")
  : any;
