export type RemoteKeys = "mf_pretrip/App";
type PackageType<T> = T extends "mf_pretrip/App"
  ? typeof import("mf_pretrip/App")
  : any;
