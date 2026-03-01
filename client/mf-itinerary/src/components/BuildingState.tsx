import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function BuildingState() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = localStorage.getItem("building-itinerary-started");
    const baseTime = startedAt
      ? Math.floor((Date.now() - parseInt(startedAt, 10)) / 1000)
      : 0;
    setElapsed(baseTime);

    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-3 mx-4 mt-4 rounded-lg bg-indigo-950 text-indigo-200 text-sm font-medium">
      <Loader2 className="w-4 h-4 animate-spin" />
      Building your itinerary with AI... This may take 15–30 seconds.
      <span className="ml-auto text-indigo-400 tabular-nums">{elapsed}s</span>
    </div>
  );
}
