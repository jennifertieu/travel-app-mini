import { useState, useEffect, useCallback } from 'react';
import { LocationService } from '../services/locationService';
import { UseLocationReturn } from '../types/location';
import { useDemoContext } from '../demo/DemoContext';

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
  const { isDemo, demoLocation } = useDemoContext();
  const [position, setPosition] = useState(() => LocationService.getCachedLocation());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');

  // Check permission on mount and auto-request location if allowed
  useEffect(() => {
    const init = async () => {
      const status = await LocationService.checkPermissionStatus();
      setPermissionStatus(status);

      // Auto-request if already granted or if browser will prompt
      if ((status === 'granted' || status === 'prompt') && !position) {
        setIsLoading(true);
        try {
          const coords = await LocationService.getCurrentPosition();
          setPosition(coords);
          setPermissionStatus('granted');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to get location';
          setError(msg);
          if (msg.includes('permission denied')) {
            setPermissionStatus('denied');
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (isDemo) {
    return {
      position: {
        latitude: demoLocation.lat,
        longitude: demoLocation.lng,
        accuracy: 10,
        timestamp: Date.now(),
      },
      isLoading: false,
      error: null,
      permissionStatus: 'granted',
      requestLocation: async () => {},
      clearError: () => {},
    };
  }

  return {
    position,
    isLoading,
    error,
    permissionStatus,
    requestLocation,
    clearError,
  };
};
