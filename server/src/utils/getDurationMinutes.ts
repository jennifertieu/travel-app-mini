export const getDurationMinutes = (activity: any) => {
  if (
    typeof activity.duration === "string" &&
    activity.duration.includes("hour")
  ) {
    return parseInt(activity.duration) * 60;
  }
  if (typeof activity.duration === "number") {
    return activity.duration;
  }
  return 0;
};
