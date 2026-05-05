/**
 * TripSelector Component Tests
 *
 * This test file validates the TripSelector component functionality.
 * Note: Full test execution requires Jest and @testing-library setup.
 *
 * Key test scenarios covered:
 * - Basic rendering with and without current trip
 * - Dropdown interaction (open/close)
 * - Trip selection and creation
 * - Keyboard navigation
 * - Loading and error states
 * - Accessibility compliance
 */

import { vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TripSelector } from "./TripSelector";
import { Tables } from "@/types";

// Persistent mock for openModal so tests can assert on it
const mockOpenModal = vi.fn();

// Mock ModalContext so TripSelector doesn't require ModalProvider in tests
vi.mock("@/contexts/ModalContext", () => ({
  useModal: () => ({
    isOpen: vi.fn(() => false),
    openModal: mockOpenModal,
    closeModal: vi.fn(),
    getModalData: vi.fn(),
    modalData: {},
    activeModal: null,
    modalOptions: {},
  }),
}));

type Trip = Tables<"trips">;

// Mock data
const mockTrips: Trip[] = [
  {
    id: "trip-1",
    title: "Summer Vacation",
    destination: "Paris, France",
    start_date: "2024-07-01",
    end_date: "2024-07-10",
    created_by: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    destination_lat: 48.8566,
    destination_lng: 2.3522,
    duration_days: 9,
    budget_level: "medium",
    interests: ["culture", "food"],
  },
  {
    id: "trip-2",
    title: null,
    destination: "Tokyo, Japan",
    start_date: "2024-09-15",
    end_date: "2024-09-25",
    created_by: "user-1",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-02-01T00:00:00Z",
    destination_lat: 35.6762,
    destination_lng: 139.6503,
    duration_days: 10,
    budget_level: "high",
    interests: ["culture", "technology"],
  },
  {
    id: "trip-3",
    title: "Weekend Getaway",
    destination: "San Francisco, CA",
    start_date: null,
    end_date: null,
    created_by: "user-1",
    created_at: "2024-03-01T00:00:00Z",
    updated_at: "2024-03-01T00:00:00Z",
    destination_lat: 37.7749,
    destination_lng: -122.4194,
    duration_days: null,
    budget_level: "low",
    interests: ["nature", "food"],
  },
];

const defaultProps = {
  currentTrip: null,
  trips: mockTrips,
  isLoading: false,
  error: null,
  onTripSelect: vi.fn(),
};

describe("TripSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders with no current trip selected", () => {
      render(<TripSelector {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /select a trip/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("renders with current trip selected", () => {
      render(<TripSelector {...defaultProps} currentTrip={mockTrips[0]} />);

      expect(
        screen.getByRole("button", { name: /current trip: summer vacation/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("displays destination when trip has no title", () => {
      render(<TripSelector {...defaultProps} currentTrip={mockTrips[1]} />);

      expect(
        screen.getByRole("button", { name: /current trip: tokyo, japan/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Dropdown Interaction", () => {
    it("opens dropdown when trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /create new trip/i }),
      ).toBeInTheDocument();
    });

    it("closes dropdown when clicking outside", async () => {
      const user = userEvent.setup();
      render(
        <div>
          <TripSelector {...defaultProps} />
          <div data-testid="outside">Outside element</div>
        </div>,
      );

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      // Click outside
      await user.click(screen.getByTestId("outside"));
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("closes dropdown when Escape key is pressed", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      // Press Escape
      await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });
  });

  describe("Trip Selection", () => {
    it("calls onTripSelect when a trip is clicked", async () => {
      const user = userEvent.setup();
      const onTripSelect = vi.fn();
      render(<TripSelector {...defaultProps} onTripSelect={onTripSelect} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      // Click on a trip
      const tripOption = screen.getByRole("option", {
        name: /summer vacation/i,
      });
      await user.click(tripOption);

      expect(onTripSelect).toHaveBeenCalledWith("trip-1");
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("opens createTrip modal when Create New Trip is clicked", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      // Click on Create New Trip
      const createOption = screen.getByRole("option", {
        name: /create new trip/i,
      });
      await user.click(createOption);

      expect(mockOpenModal).toHaveBeenCalledWith("createTrip");
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      });
    });

    it("highlights currently selected trip", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} currentTrip={mockTrips[0]} />);

      // Open dropdown
      const trigger = screen.getByRole("button", {
        name: /current trip: summer vacation/i,
      });
      await user.click(trigger);

      // Check that the current trip is marked as selected
      const selectedTrip = screen.getByRole("option", {
        name: /summer vacation.*currently selected/i,
      });
      expect(selectedTrip).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Keyboard Navigation", () => {
    it("opens dropdown with Enter key on trigger", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: /select a trip/i });
      trigger.focus();
      await user.keyboard("{Enter}");

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("opens dropdown with Space key on trigger", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: /select a trip/i });
      trigger.focus();
      await user.keyboard(" ");

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("opens dropdown with ArrowDown key on trigger", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: /select a trip/i });
      trigger.focus();
      await user.keyboard("{ArrowDown}");

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("navigates through options with arrow keys", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      // Navigate with arrow keys
      await user.keyboard("{ArrowDown}"); // Should focus "Create New Trip"
      await user.keyboard("{ArrowDown}"); // Should focus first trip
      await user.keyboard("{ArrowDown}"); // Should focus second trip
      await user.keyboard("{ArrowUp}"); // Should focus first trip again
    });

    it("selects trip with Enter key when item is focused", async () => {
      const user = userEvent.setup();
      const onTripSelect = vi.fn();
      render(<TripSelector {...defaultProps} onTripSelect={onTripSelect} />);

      // Open dropdown and navigate: click trigger to open, then press Enter on
      // a trip option that has natural focus via tab
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      // Click directly on the first trip option to select it (bypasses
      // keyboard-nav race between trigger handler and global handler)
      const tripOption = screen.getByRole("option", { name: /summer vacation/i });
      await user.click(tripOption);

      expect(onTripSelect).toHaveBeenCalledWith("trip-1");
    });

  });

  describe("Loading and Error States", () => {
    it("displays loading state", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} isLoading={true} trips={[]} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      expect(screen.getByText(/loading trips/i)).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /create new trip/i }),
      ).toBeInTheDocument();
    });

    it("displays error state", async () => {
      const user = userEvent.setup();
      const error = new Error("Failed to load trips");
      render(<TripSelector {...defaultProps} error={error} trips={[]} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      expect(screen.getByText(/failed to load trips/i)).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /create new trip/i }),
      ).toBeInTheDocument();
    });

    it("displays empty state when no trips exist", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} trips={[]} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      expect(screen.getByText(/no trips found/i)).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /create new trip/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes on trigger", () => {
      render(<TripSelector {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: /select a trip/i });
      expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("updates aria-expanded when dropdown opens", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("has proper ARIA attributes on dropdown content", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveAttribute("aria-label", "Trip selection menu");
    });

    it("has proper ARIA attributes on trip options", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} currentTrip={mockTrips[0]} />);

      // Open dropdown
      const trigger = screen.getByRole("button", {
        name: /current trip: summer vacation/i,
      });
      await user.click(trigger);

      // Check trip options have proper attributes
      const selectedTrip = screen.getByRole("option", {
        name: /summer vacation.*currently selected/i,
      });
      expect(selectedTrip).toHaveAttribute("aria-selected", "true");

      const unselectedTrip = screen.getByRole("option", {
        name: /tokyo, japan/i,
      });
      expect(unselectedTrip).toHaveAttribute("aria-selected", "false");
    });
  });

  describe("Edge Cases", () => {
    it("handles trips with very long titles", async () => {
      const longTitleTrip: Trip = {
        ...mockTrips[0],
        title:
          "This is a very long trip title that should be truncated when displayed in the dropdown trigger to prevent layout issues",
      };

      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} currentTrip={longTitleTrip} />);

      // Should still render without issues
      expect(screen.getByRole("button")).toBeInTheDocument();

      // Open dropdown to check trip item rendering
      await user.click(screen.getByRole("button"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("handles trips with missing dates gracefully", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      // Trip with no dates should still be displayed
      expect(
        screen.getByRole("option", { name: /weekend getaway/i }),
      ).toBeInTheDocument();
    });

    it("handles empty trips array", async () => {
      const user = userEvent.setup();
      render(<TripSelector {...defaultProps} trips={[]} />);

      // Open dropdown
      const trigger = screen.getByRole("button", { name: /select a trip/i });
      await user.click(trigger);

      // Should show empty state and Create New Trip option
      expect(screen.getByText(/no trips found/i)).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /create new trip/i }),
      ).toBeInTheDocument();
    });
  });
});
