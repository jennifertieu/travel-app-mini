import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLocation } from "./useLocation";

// Mock the LocationService
vi.mock("../services/locationService", () => ({
  LocationService: {
    getCachedLocation: vi.fn(() => null),
    checkPermissionStatus: vi.fn(async () => "prompt" as const),
    getCurrentPosition: vi.fn(),
  },
}));

describe("useLocation", () => {
  it("initializes with null position", () => {
    const { result } = renderHook(() => useLocation());
    expect(result.current.position).toBeNull();
  });

  it("initializes with isLoading false", () => {
    const { result } = renderHook(() => useLocation());
    expect(result.current.isLoading).toBe(false);
  });
});
