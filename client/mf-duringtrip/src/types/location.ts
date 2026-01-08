export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationState {
  position: LocationCoordinates | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unavailable';
}

export interface UseLocationReturn extends LocationState {
  requestLocation: () => Promise<void>;
  clearError: () => void;
}
