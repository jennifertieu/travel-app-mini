import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChatAgent } from "./useChatAgent";

vi.mock("../lib/api", () => ({
  getApiUrl: vi.fn(() => "http://localhost:3001"),
  buildAuthHeaders: vi.fn(async () => ({})),
}));

describe("useChatAgent", () => {
  it("initializes with a welcome message", () => {
    const { result } = renderHook(() =>
      useChatAgent({ tripId: "trip-1", onItineraryUpdated: vi.fn() })
    );
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].id).toBe("welcome");
  });

  it("initializes with status 'idle'", () => {
    const { result } = renderHook(() =>
      useChatAgent({ tripId: "trip-1", onItineraryUpdated: vi.fn() })
    );
    expect(result.current.status).toBe("idle");
  });

  it("initializes with no pending changes", () => {
    const { result } = renderHook(() =>
      useChatAgent({ tripId: "trip-1", onItineraryUpdated: vi.fn() })
    );
    expect(result.current.pendingChanges).toEqual([]);
  });

  it("initializes with chat closed", () => {
    const { result } = renderHook(() =>
      useChatAgent({ tripId: "trip-1", onItineraryUpdated: vi.fn() })
    );
    expect(result.current.isChatOpen).toBe(false);
  });
});
