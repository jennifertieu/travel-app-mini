import { useState, useEffect, useCallback } from 'react';
import { LocationService } from '../services/locationService';
import { UseLocationReturn } from '../types/location';

/**
 * Hook for managing geolocation state and permissions
 *
 * Features:
 * - Request user's current location
 * - Cache location for 5 minutes
 * - Handle permission states
 * - Provide loading and error states
 */
export const useLocation = (): UseLocationReturn => {
  const [position, setPosition] = useState(() => LocationService.getCachedLocation());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');

  // Check permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      const status = await LocationService.checkPermissionStatus();
      setPermissionStatus(status);
    };

    checkPermission();
  }, []);

  /**
   * Request the user's current location
   */
  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const coords = await LocationService.getCurrentPosition();
      setPosition(coords);
      setPermissionStatus('granted');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);

      // Update permission status if denied
      if (errorMessage.includes('permission denied')) {
        setPermissionStatus('denied');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear any error messages
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    position,
    isLoading,
    error,
    permissionStatus,
    requestLocation,
    clearError,
  };
};
