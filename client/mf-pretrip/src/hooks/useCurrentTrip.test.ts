import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurrentTrip } from './useCurrentTrip';
import { useTrip } from './useTrip';

// Mock the useTrip hook
jest.mock('./useTrip');
const mockUseTrip = useTrip as jest.MockedFunction<typeof useTrip>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockTrip = {
  id: 'trip-123',
  title: 'Test Trip',
  destination: 'Paris',
  created_by: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  destination_lat: 48.8566,
  destination_lng: 2.3522,
  start_date: '2024-06-01',
  end_date: '2024-06-07',
  duration_days: 7,
  budget_level: 'medium',
  interests: ['culture', 'food'],
};

describe('useCurrentTrip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrip.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);
  });

  afterEach(() => {
    mockConsoleWarn.mockClear();
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
  });

  it('should initialize with null trip when localStorage is empty', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    expect(result.current.currentTripId).toBeNull();
    expect(result.current.currentTrip).toBeNull();
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('current-trip-id');
  });

  it('should initialize with trip ID from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('trip-123');
    mockUseTrip.mockReturnValue({
      data: mockTrip,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    expect(result.current.currentTripId).toBe('trip-123');
    expect(result.current.currentTrip).toEqual(mockTrip);
    expect(mockUseTrip).toHaveBeenCalledWith('trip-123');
  });

  it('should handle localStorage unavailability gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage not available');
    });

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    expect(result.current.currentTripId).toBeNull();
    expect(result.current.isLocalStorageAvailable).toBe(false);
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'localStorage unavailable, continuing without persistence:',
      expect.any(Error)
    );
  });

  it('should set current trip and persist to localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    const mockQueryClient = {
      invalidateQueries: jest.fn(),
      prefetchQuery: jest.fn(),
    };

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setCurrentTrip('new-trip-123');
    });

    expect(result.current.currentTripId).toBe('new-trip-123');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('current-trip-id', 'new-trip-123');
  });

  it('should invalidate caches when switching trips', async () => {
    mockLocalStorage.getItem.mockReturnValue('old-trip-123');
    
    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setCurrentTrip('new-trip-456');
    });

    expect(result.current.currentTripId).toBe('new-trip-456');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('current-trip-id', 'new-trip-456');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('generating-suggestions');
  });

  it('should clear current trip and localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('trip-123');

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.clearCurrentTrip();
    });

    expect(result.current.currentTripId).toBeNull();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('current-trip-id');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('generating-suggestions');
  });

  it('should handle trip creation and set as current', async () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleTripCreated(mockTrip);
    });

    expect(result.current.currentTripId).toBe('trip-123');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('current-trip-id', 'trip-123');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('generating-suggestions', 'true');
  });

  it('should handle localStorage errors during setCurrentTrip', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('localStorage quota exceeded');
    });

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setCurrentTrip('trip-123');
    });

    expect(result.current.currentTripId).toBe('trip-123');
    expect(result.current.isLocalStorageAvailable).toBe(false);
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Failed to persist trip ID to localStorage:',
      expect.any(Error)
    );
  });

  it('should handle localStorage errors during clearCurrentTrip', () => {
    mockLocalStorage.getItem.mockReturnValue('trip-123');
    mockLocalStorage.removeItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.clearCurrentTrip();
    });

    expect(result.current.currentTripId).toBeNull();
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'Failed to clear trip data from localStorage:',
      expect.any(Error)
    );
  });

  it('should forward loading and error states from useTrip', () => {
    mockLocalStorage.getItem.mockReturnValue('trip-123');
    mockUseTrip.mockReturnValue({
      data: null,
      isLoading: true,
      error: new Error('Network error'),
      refetch: jest.fn(),
    } as any);

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toEqual(new Error('Network error'));
  });

  it('should not invalidate caches when setting the same trip ID', () => {
    mockLocalStorage.getItem.mockReturnValue('trip-123');

    const { result } = renderHook(() => useCurrentTrip(), {
      wrapper: createWrapper(),
    });

    // Set the same trip ID
    act(() => {
      result.current.setCurrentTrip('trip-123');
    });

    expect(result.current.currentTripId).toBe('trip-123');
    expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('generating-suggestions');
  });
});