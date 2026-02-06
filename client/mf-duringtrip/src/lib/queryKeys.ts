export const queryKeys = {
  userTrips: (userId: string) => ["user-trips", userId] as const,
} as const;
