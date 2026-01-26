export const getDurationMinutes = (activity: any) => {
  // Check duration_minutes first (most common format)
  if (typeof activity.duration_minutes === "number") {
    return activity.duration_minutes;
  }
  
  // Check duration string (e.g., "2 hours")
  if (
    typeof activity.duration === "string" &&
    activity.duration.includes("hour")
  ) {
    return parseInt(activity.duration) * 60;
  }
  
  // Check duration as number
  if (typeof activity.duration === "number") {
    return activity.duration;
  }
  
  return 0;
};
