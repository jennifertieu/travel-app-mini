import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Annotation } from "../lib/annotation-utils";

export function useAnnotations(tripId: string | null): Annotation[] {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    if (!tripId) {
      setAnnotations([]);
      return;
    }

    // Fetch initial annotations
    supabase
      .from("trip_annotations" as any)
      .select("*")
      .eq("trip_id", tripId)
      .then(({ data, error }) => {
        if (error) {
          console.warn("Failed to fetch annotations:", error.message);
          setAnnotations([]);
          return;
        }
        setAnnotations(((data as unknown) as Annotation[]) ?? []);
      });

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`annotations-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_annotations",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          setAnnotations((prev) => [...prev, payload.new as Annotation]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trip_annotations",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const updated = payload.new as Annotation;
          setAnnotations((prev) =>
            prev.map((a) => (a.id === updated.id ? updated : a)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "trip_annotations",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setAnnotations((prev) => prev.filter((a) => a.id !== deletedId));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  return annotations;
}
