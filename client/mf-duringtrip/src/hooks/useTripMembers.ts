import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useTripMembers(tripId: string | null): {
  count: number;
  isLoading: boolean;
} {
  const [count, setCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tripId) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const { count: memberCount } = await supabase
          .from("trip_members")
          .select("id", { count: "exact", head: true })
          .eq("trip_id", tripId);
        setCount(memberCount && memberCount > 0 ? memberCount : 1);
      } catch {
        setCount(1);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [tripId]);

  return { count, isLoading };
}
