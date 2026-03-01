/**
 * Hotel recommendation utility
 * Scores and ranks hotel ideas by weighted rating + proximity to activity centroid.
 */

export interface HotelRecommendation {
  ideaId: string;
  name: string;
  reason: string;
  rating: number | null;
  address: string | null;
  photoUrl: string | null;
  nightlyRate: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ScoredHotel {
  idea: any;
  score: number;
  distanceKm: number | null;
}

// ─── 1.1 Haversine distance ───────────────────────────────────────────────────

/**
 * Returns the great-circle distance in km between two lat/lng points.
 */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── 1.2 Activity centroid ────────────────────────────────────────────────────

/**
 * Computes the average lat/lng of all activities across all days that have
 * non-null coordinates. Returns null when no valid coordinates exist.
 */
export function computeActivityCentroid(
  days: any[],
): { lat: number; lng: number } | null {
  const coords: { lat: number; lng: number }[] = [];

  for (const day of days) {
    const activities: any[] = day.activities ?? day.items ?? [];
    for (const activity of activities) {
      const lat =
        activity.latitude ??
        activity.place?.latitude ??
        activity.coordinates?.lat ??
        null;
      const lng =
        activity.longitude ??
        activity.place?.longitude ??
        activity.coordinates?.lng ??
        null;
      if (lat != null && lng != null) {
        coords.push({ lat: Number(lat), lng: Number(lng) });
      }
    }
  }

  if (coords.length === 0) return null;

  const sumLat = coords.reduce((s, c) => s + c.lat, 0);
  const sumLng = coords.reduce((s, c) => s + c.lng, 0);
  return { lat: sumLat / coords.length, lng: sumLng / coords.length };
}

// ─── 1.3 Score a single hotel ─────────────────────────────────────────────────

/**
 * Scores a hotel idea.
 * score = 0.6 * normalizedRating + 0.4 * inverseNormalizedDistance
 * Falls back to rating-only when centroid is null.
 *
 * @param hotel      - trip_reel_ideas row
 * @param centroid   - activity centroid or null
 * @param maxDist    - max distance among all hotels (used for normalization)
 */
export function scoreHotel(
  hotel: any,
  centroid: { lat: number; lng: number } | null,
  maxDist: number,
): number {
  const rating = hotel.place?.rating ?? hotel.rating ?? 0;
  const normalizedRating = rating / 5.0;

  if (!centroid) {
    return normalizedRating;
  }

  const hotelLat = hotel.place?.latitude ?? hotel.latitude ?? null;
  const hotelLng = hotel.place?.longitude ?? hotel.longitude ?? null;

  if (hotelLat == null || hotelLng == null) {
    // No coordinates — treat as max distance (worst proximity)
    return 0.6 * normalizedRating;
  }

  const dist = distanceKm(
    centroid.lat,
    centroid.lng,
    Number(hotelLat),
    Number(hotelLng),
  );
  const effectiveMax = maxDist > 0 ? maxDist : 1;
  const normalizedDistance = dist / effectiveMax;
  const inverseNormalizedDistance = 1 - normalizedDistance;

  return 0.6 * normalizedRating + 0.4 * inverseNormalizedDistance;
}

// ─── 1.4 Rank hotels ──────────────────────────────────────────────────────────

/**
 * Scores all hotels and returns them sorted by score descending.
 */
export function rankHotels(
  hotels: any[],
  centroid: { lat: number; lng: number } | null,
): ScoredHotel[] {
  if (hotels.length === 0) return [];

  // Pre-compute distances for normalization
  const distances: number[] = hotels.map((h) => {
    if (!centroid) return 0;
    const lat = h.place?.latitude ?? h.latitude ?? null;
    const lng = h.place?.longitude ?? h.longitude ?? null;
    if (lat == null || lng == null) return 0;
    return distanceKm(centroid.lat, centroid.lng, Number(lat), Number(lng));
  });

  const maxDist = Math.max(...distances, 0);

  const scored: ScoredHotel[] = hotels.map((hotel, i) => ({
    idea: hotel,
    score: scoreHotel(hotel, centroid, maxDist),
    distanceKm: centroid ? distances[i] : null,
  }));

  return scored.sort((a, b) => b.score - a.score);
}

// ─── 1.5 Generate reason ──────────────────────────────────────────────────────

/**
 * Returns a plain-English reason string (≤ 120 chars) for the winning hotel.
 */
export function generateReason(
  _hotel: any,
  isTopRated: boolean,
  isClosest: boolean,
): string {
  if (isTopRated && isClosest) {
    return "Top-rated stay and closest to your activities";
  }
  if (isTopRated) {
    return "Highest rated hotel near your destination";
  }
  if (isClosest) {
    return "Closest hotel to your planned activities";
  }
  return "Best overall match for rating and location";
}

// ─── 1.6 Build hotel payload ──────────────────────────────────────────────────

/**
 * Maps a trip_reel_ideas row + reason string to the HotelRecommendation shape.
 */
export function buildHotelPayload(
  hotel: any,
  reason: string,
): HotelRecommendation {
  const place = hotel.place ?? {};

  // Photo: prefer array, fall back to single photoUrl field
  const photoUrl: string | null =
    (Array.isArray(place.photos) && place.photos.length > 0
      ? place.photos[0]
      : null) ??
    place.photoUrl ??
    null;

  const latitude: number | null = place.latitude ?? hotel.latitude ?? null;
  const longitude: number | null = place.longitude ?? hotel.longitude ?? null;

  return {
    ideaId: hotel.id,
    name: hotel.title ?? hotel.name ?? "Unknown Hotel",
    reason,
    rating: place.rating ?? hotel.rating ?? null,
    address: place.address ?? null,
    photoUrl,
    nightlyRate: place.nightlyRate ?? null,
    latitude: latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
  };
}
