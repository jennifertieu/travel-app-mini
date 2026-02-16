import { useState } from "react";
import { searchPlaces } from "../lib/place-search";
import { useAddIdea } from "./useIdeas";
import { useMember } from "../contexts/MemberContext";
import { BoxCoordinates } from "./useRealtimeTrip";

export function useBoxSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const { mutateAsync: addIdea } = useAddIdea();
  const { member } = useMember();

  const searchAndAddIdeas = async (
    tripId: string,
    query: string,
    bounds: BoxCoordinates
  ) => {
    if (!member) return;
    setIsSearching(true);

    try {
      // 1. Search for places within the bounds
      const results = await searchPlaces(query, {
        minLat: bounds.south,
        maxLat: bounds.north,
        minLng: bounds.west,
        maxLng: bounds.east,
      });

      // 2. Add top results as ideas
      const topResults = results.slice(0, 5); // Limit to top 5 to avoid spam
      
      await Promise.all(
        topResults.map((place) =>
          addIdea({
            trip_id: tripId,
            title: place.name || query,
            summary: `Found via map search: "${query}"`,
            source_platform: "map_search",
            created_by: member.id,
            latitude: place.lat,
            longitude: place.lng,
            location: {
              address: place.displayName,
              confidence: "high",
            },
            tags: [query, "map_search"],
            enrichment_status: "pending", // Let background worker enrich details
          })
        )
      );

      return topResults.length;
    } catch (error) {
      console.error("Box search failed:", error);
      throw error;
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchAndAddIdeas,
    isSearching,
  };
}
