import { vi } from "vitest";
import React from "react";
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserTrips } from './useUserTrips';
import { supabase } from '../lib/supabase';

// Mock the supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

// Build a chainable supabase query mock that resolves at the end of the chain.
// The hook calls: .from().select().eq().is().order() (owned trips)
//             and: .from().select().neq().eq().is().order() (collaborative trips)
function buildChainMock(resolvedValue: { data: unknown; error: null | Error }) {
  const chain: Record<string, unknown> = {};
  const terminal = vi.fn().mockResolvedValue(resolvedValue);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.order = terminal;
  return { chain, terminal };
}

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useUserTrips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return undefined data and not be loading when userId is null', async () => {
    const { result } = renderHook(() => useUserTrips(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should fetch trips for authenticated user', async () => {
    const mockOwnedTrips = [
      {
        id: '1',
        destination: 'Tokyo',
        title: 'Japan Adventure',
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        trip_collaborators: [],
      },
    ];

    // The hook makes two queries: one for owned trips, one for collaborative trips
    const { chain: ownedChain } = buildChainMock({ data: mockOwnedTrips, error: null });
    const { chain: collabChain } = buildChainMock({ data: [], error: null });

    // Return a different chain for each call to from()
    mockFrom
      .mockReturnValueOnce(ownedChain as any)
      .mockReturnValueOnce(collabChain as any);

    const { result } = renderHook(() => useUserTrips('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFrom).toHaveBeenCalledWith('trips');
    // Data is transformed with collaboration info
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({
      id: '1',
      destination: 'Tokyo',
      is_owner: true,
    });
  });

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Database connection failed');

    const { chain: errorChain } = buildChainMock({ data: null, error: mockError });
    // Make the owned-trips query reject
    (errorChain.order as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

    mockFrom.mockReturnValue(errorChain as any);

    const { result } = renderHook(() => useUserTrips('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should return defined hook result', () => {
    // Basic smoke test: hook is defined even before data loads
    const { result } = renderHook(() => useUserTrips('user-123'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });

  it('should handle empty results', async () => {
    const { chain: ownedChain } = buildChainMock({ data: [], error: null });
    const { chain: collabChain } = buildChainMock({ data: [], error: null });

    mockFrom
      .mockReturnValueOnce(ownedChain as any)
      .mockReturnValueOnce(collabChain as any);

    const { result } = renderHook(() => useUserTrips('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});
