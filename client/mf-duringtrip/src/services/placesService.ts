// API base URL - defaults to localhost:5001 for development
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5001';

export interface NearbyPlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  types: string[];
  category: string;
  distanceMeters: number;
  isOpen?: boolean;
  photoUrl?: string;
}

export interface PlaceReview {
  authorName: string;
  authorUrl?: string;
  rating: number;
  text: string;
  time: number;
  relativeTimeDescription: string;
  profilePhotoUrl?: string;
  language?: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  phoneNumber?: string;
  website?: string;
  openingHours?: {
    isOpen: boolean;
    weekdayText: string[];
  };
  reviews?: PlaceReview[];
  photos?: string[];
}

export interface SearchNearbyParams {
  latitude: number;
  longitude: number;
  category?: string;
  keyword?: string;
  radius?: number;
  maxResults?: number;
}

export class PlacesService {
  /**
   * Search for nearby places
   */
  static async searchNearby(params: SearchNearbyParams): Promise<NearbyPlace[]> {
    const response = await fetch(`${API_BASE_URL}/places/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Search failed' }));
      throw new Error(error.error || error.details || 'Failed to search for places');
    }

    return response.json();
  }

  /**
   * Get detailed information about a specific place
   */
  static async getDetails(placeId: string): Promise<PlaceDetails | null> {
    const response = await fetch(`${API_BASE_URL}/places/details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ placeId }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json().catch(() => ({ error: 'Failed to get details' }));
      throw new Error(error.error || error.details || 'Failed to get place details');
    }

    return response.json();
  }
}
