import { LocationCoordinates } from '../types/location';

const LOCATION_CACHE_KEY = 'duringtrip_location_cache';
const CACHE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

interface CachedLocation {
  position: LocationCoordinates;
  cachedAt: number;
}

export class LocationService {
  /**
   * Get the current position using the browser's Geolocation API
   */
  static async getCurrentPosition(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: LocationCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          // Cache the location
          this.cacheLocation(coords);

          resolve(coords);
        },
        (error) => {
          reject(this.formatGeolocationError(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Check the permission status for geolocation
   */
  static async checkPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> {
    if (!navigator.permissions) {
      return 'unavailable';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch (error) {
      // If permissions API is not supported, assume prompt
      return 'prompt';
    }
  }

  /**
   * Get cached location if it's still valid
   */
  static getCachedLocation(): LocationCoordinates | null {
    try {
      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (!cached) return null;

      const { position, cachedAt }: CachedLocation = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - cachedAt < CACHE_EXPIRY_MS) {
        return position;
      }

      // Cache expired, remove it
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    } catch (error) {
      console.error('Error reading location cache:', error);
      return null;
    }
  }

  /**
   * Cache the current location
   */
  private static cacheLocation(position: LocationCoordinates): void {
    try {
      const cacheData: CachedLocation = {
        position,
        cachedAt: Date.now(),
      };
      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching location:', error);
    }
  }

  /**
   * Format geolocation error into a user-friendly message
   */
  private static formatGeolocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('Location permission denied. Please enable location access in your browser settings.');
      case error.POSITION_UNAVAILABLE:
        return new Error('Location information is unavailable. Please check your device settings.');
      case error.TIMEOUT:
        return new Error('Location request timed out. Please try again.');
      default:
        return new Error('An unknown error occurred while getting your location.');
    }
  }

  /**
   * Clear the location cache
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(LOCATION_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing location cache:', error);
    }
  }
}
