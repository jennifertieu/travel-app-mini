import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserTrips } from "./useUserTrips";
import { useMember } from "../contexts/MemberContext";

// Mock the contexts and supabase
jest.mock("../contexts/MemberContext");
jest.mock("../lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: "1",
                  destination: "Tokyo",
                  title: "Japan Adventure",
                  created_by: "member-123",
                  created_at: "2024-01-01T00:00:00Z",
                  updated_at: "2024-01-01T00:00:00Z",
                },
              ],
              error: null,
            }),
          ),
        })),
      })),
    })),
  },
}));

const mockUseMember = useMember as jest.MockedFunction<typeof useMember>;

// Test component that uses the hook
function TestComponent() {
  const { member } = useMember();
  const { data: trips, isLoading, error } = useUserTrips(member?.id || null);

  if (isLoading) return <div>Loading trips...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!trips || trips.length === 0) return <div>No trips found</div>;

  return (
    <div>
      <h2>User Trips</h2>
      {trips.map((trip) => (
        <div key={trip.id} data-testid={`trip-${trip.id}`}>
          <h3>{trip.title}</h3>
          <p>{trip.destination}</p>
        </div>
      ))}
    </div>
  );
}

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

describe("useUserTrips Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should integrate with MemberContext and display trips", async () => {
    // Mock member context
    mockUseMember.mockReturnValue({
      member: {
        id: "member-123",
        displayName: "Test User",
        dietary: [],
        travelStyle: "balanced",
        interests: [],
      },
      updateMember: jest.fn(),
      isInitialized: true,
    });

    render(<TestComponent />, { wrapper: createWrapper() });

    // Should show loading initially
    expect(screen.getByText("Loading trips...")).toBeInTheDocument();

    // Should show trips after loading
    await waitFor(() => {
      expect(screen.getByText("User Trips")).toBeInTheDocument();
      expect(screen.getByText("Japan Adventure")).toBeInTheDocument();
      expect(screen.getByText("Tokyo")).toBeInTheDocument();
    });
  });

  it("should handle no member gracefully", async () => {
    // Mock no member
    mockUseMember.mockReturnValue({
      member: null,
      updateMember: jest.fn(),
      isInitialized: true,
    });

    render(<TestComponent />, { wrapper: createWrapper() });

    // Should show no trips when no member
    await waitFor(() => {
      expect(screen.getByText("No trips found")).toBeInTheDocument();
    });
  });
});
