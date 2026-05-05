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

    supabase
      .from("trip_members")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId)
      .then(({ count: memberCount, error }) => {
        if (error) {
          setCount(1);
        } else {
          setCount(memberCount && memberCount > 0 ? memberCount : 1);
        }
        setIsLoading(false);
      });
  }, [tripId]);

  return { count, isLoading };
}
