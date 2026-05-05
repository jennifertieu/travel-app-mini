/**
 * Centralized Query Key Factory for Trip-Specific Data
 *
 * This factory provides consistent query key patterns for all trip-specific data,
 * enabling comprehensive cache invalidation and management when switching trips.
 */

export const queryKeys = {
  // Core trip data
  trip: (tripId: string) => ["trip", tripId] as const,

  // Trip-specific data
  ideas: (tripId: string) => ["ideas", tripId] as const,
  suggestions: (tripId: string) => ["suggestions", tripId] as const,
  members: (tripId: string) => ["trip-members", tripId] as const,
  comments: (tripId: string) => ["comments", tripId] as const,
  reactions: (tripId: string) => ["reactions", tripId] as const,

  // User-specific data (not trip-specific)
  userTrips: (userId: string) => ["user-trips", userId] as const,
  userProfile: (userId: string) => ["user-profile", userId] as const,

  // Generic trip data pattern for future extensions
  tripData: (tripId: string, dataType: string) => [dataType, tripId] as const,

  // Utility methods
  getAllTripKeys: (tripId: string) => [
    queryKeys.trip(tripId),
    queryKeys.ideas(tripId),
    queryKeys.suggestions(tripId),
    queryKeys.members(tripId),
    queryKeys.comments(tripId),
    queryKeys.reactions(tripId),
  ],

  /**
   * Check if a query key is trip-specific
   * @param queryKey - The query key to check
   * @returns true if the query key is trip-specific
   */
  isTripSpecific: (queryKey: readonly unknown[]): boolean => {
    if (!Array.isArray(queryKey) || queryKey.length < 2) return false;

    const [type, identifier] = queryKey;

    // Check if it's a known trip-specific pattern
    const tripSpecificTypes = [
      "trip",
      "ideas",
      "suggestions",
      "trip-members",
      "comments",
      "reactions",
    ];

    return (
      tripSpecificTypes.includes(type as string) &&
      typeof identifier === "string"
    );
  },

  /**
   * Extract trip ID from a trip-specific query key
   * @param queryKey - The query key to extract from
   * @returns trip ID if found, null otherwise
   */
  extractTripId: (queryKey: readonly unknown[]): string | null => {
    if (!queryKeys.isTripSpecific(queryKey)) return null;
    return queryKey[1] as string;
  },

  /**
   * Get all query keys that match a specific trip ID
   * @param allQueryKeys - All query keys from React Query cache
   * @param tripId - The trip ID to match
   * @returns Array of query keys that belong to the specified trip
   */
  getTripSpecificKeys: (
    allQueryKeys: readonly unknown[][],
    tripId: string,
  ): readonly unknown[][] => {
    return allQueryKeys.filter((queryKey) => {
      const extractedTripId = queryKeys.extractTripId(queryKey);
      return extractedTripId === tripId;
    });
  },
} as const;

export type QueryKeys = typeof queryKeys;
