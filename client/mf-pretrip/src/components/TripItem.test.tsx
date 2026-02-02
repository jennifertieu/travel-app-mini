import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TripItem } from "./TripItem";
import { Tables } from "@travel-app/shared-types";

type Trip = Tables<"trips">;

// Mock the utils
jest.mock("../lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("TripItem", () => {
  const mockTrip: Trip = {
    id: "1",
    destination: "Tokyo",
    title: "Japan Adventure",
    start_date: "2024-03-01",
    end_date: "2024-03-10",
    created_by: "user-123",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    destination_lat: null,
    destination_lng: null,
    duration_days: null,
    budget_level: null,
    interests: null,
  };

  const defaultProps = {
    trip: mockTrip,
    isSelected: false,
    isFocused: false,
    onClick: jest.fn(),
    onKeyDown: jest.fn(),
    onMouseEnter: jest.fn(),
    onMouseLeave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Trip Information Display", () => {
    it("should display trip title when available", () => {
      render(<TripItem {...defaultProps} />);

      expect(screen.getByText("Japan Adventure")).toBeInTheDocument();
    });

    it("should display destination when title is not available", () => {
      const tripWithoutTitle = { ...mockTrip, title: null };
      render(<TripItem {...defaultProps} trip={tripWithoutTitle} />);

      expect(screen.getByText("Tokyo")).toBeInTheDocument();
    });

    it("should display destination when title is empty string", () => {
      const tripWithEmptyTitle = { ...mockTrip, title: "" };
      render(<TripItem {...defaultProps} trip={tripWithEmptyTitle} />);

      expect(screen.getByText("Tokyo")).toBeInTheDocument();
    });

    it("should display formatted date range when both dates are available", () => {
      render(<TripItem {...defaultProps} />);

      expect(screen.getByText("Mar 1 - Mar 10")).toBeInTheDocument();
    });

    it("should display start date only when end date is missing", () => {
      const tripWithStartOnly = { ...mockTrip, end_date: null };
      render(<TripItem {...defaultProps} trip={tripWithStartOnly} />);

      expect(screen.getByText("From Mar 1")).toBeInTheDocument();
    });

    it("should display end date only when start date is missing", () => {
      const tripWithEndOnly = { ...mockTrip, start_date: null };
      render(<TripItem {...defaultProps} trip={tripWithEndOnly} />);

      expect(screen.getByText("Until Mar 10")).toBeInTheDocument();
    });

    it("should not display date range when both dates are missing", () => {
      const tripWithoutDates = {
        ...mockTrip,
        start_date: null,
        end_date: null,
      };
      render(<TripItem {...defaultProps} trip={tripWithoutDates} />);

      expect(screen.queryByText(/Mar/)).not.toBeInTheDocument();
    });

    it("should include year in date format when different from current year", () => {
      const tripWithDifferentYear = {
        ...mockTrip,
        start_date: "2025-03-01",
        end_date: "2025-03-10",
      };
      render(<TripItem {...defaultProps} trip={tripWithDifferentYear} />);

      expect(
        screen.getByText("Mar 1, 2025 - Mar 10, 2025"),
      ).toBeInTheDocument();
    });
  });

  describe("Selection Highlighting", () => {
    it("should show check icon when trip is selected", () => {
      render(<TripItem {...defaultProps} isSelected={true} />);

      const checkIcon = screen.getByRole("img", { hidden: true });
      expect(checkIcon).toBeInTheDocument();
    });

    it("should not show check icon when trip is not selected", () => {
      render(<TripItem {...defaultProps} isSelected={false} />);

      const checkIcon = screen.queryByRole("img", { hidden: true });
      expect(checkIcon).not.toBeInTheDocument();
    });

    it("should apply selected styling when isSelected is true", () => {
      render(<TripItem {...defaultProps} isSelected={true} />);

      const button = screen.getByRole("option");
      expect(button).toHaveClass("bg-primary/10", "text-primary");
    });

    it("should apply focused styling when isFocused is true", () => {
      render(<TripItem {...defaultProps} isFocused={true} />);

      const button = screen.getByRole("option");
      expect(button).toHaveClass("bg-accent", "text-accent-foreground");
    });
  });

  describe("Keyboard Navigation Support", () => {
    it("should call onKeyDown when key is pressed", () => {
      const onKeyDown = jest.fn();
      render(<TripItem {...defaultProps} onKeyDown={onKeyDown} />);

      const button = screen.getByRole("option");
      fireEvent.keyDown(button, { key: "Enter" });

      expect(onKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "Enter",
        }),
      );
    });

    it("should handle arrow key navigation", () => {
      const onKeyDown = jest.fn();
      render(<TripItem {...defaultProps} onKeyDown={onKeyDown} />);

      const button = screen.getByRole("option");
      fireEvent.keyDown(button, { key: "ArrowDown" });

      expect(onKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "ArrowDown",
        }),
      );
    });

    it("should handle space key for selection", () => {
      const onKeyDown = jest.fn();
      render(<TripItem {...defaultProps} onKeyDown={onKeyDown} />);

      const button = screen.getByRole("option");
      fireEvent.keyDown(button, { key: " " });

      expect(onKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({
          key: " ",
        }),
      );
    });
  });

  describe("Mouse Interactions", () => {
    it("should call onClick when clicked", () => {
      const onClick = jest.fn();
      render(<TripItem {...defaultProps} onClick={onClick} />);

      const button = screen.getByRole("option");
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalled();
    });

    it("should call onMouseEnter when mouse enters", () => {
      const onMouseEnter = jest.fn();
      render(<TripItem {...defaultProps} onMouseEnter={onMouseEnter} />);

      const button = screen.getByRole("option");
      fireEvent.mouseEnter(button);

      expect(onMouseEnter).toHaveBeenCalled();
    });

    it("should call onMouseLeave when mouse leaves", () => {
      const onMouseLeave = jest.fn();
      render(<TripItem {...defaultProps} onMouseLeave={onMouseLeave} />);

      const button = screen.getByRole("option");
      fireEvent.mouseLeave(button);

      expect(onMouseLeave).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA role", () => {
      render(<TripItem {...defaultProps} />);

      const button = screen.getByRole("option");
      expect(button).toBeInTheDocument();
    });

    it("should have aria-selected attribute matching isSelected prop", () => {
      const { rerender } = render(
        <TripItem {...defaultProps} isSelected={false} />,
      );

      let button = screen.getByRole("option");
      expect(button).toHaveAttribute("aria-selected", "false");

      rerender(<TripItem {...defaultProps} isSelected={true} />);
      button = screen.getByRole("option");
      expect(button).toHaveAttribute("aria-selected", "true");
    });

    it("should have descriptive aria-label", () => {
      render(<TripItem {...defaultProps} />);

      const button = screen.getByRole("option");
      expect(button).toHaveAttribute(
        "aria-label",
        "Japan Adventure, Mar 1 - Mar 10",
      );
    });

    it("should include selection status in aria-label when selected", () => {
      render(<TripItem {...defaultProps} isSelected={true} />);

      const button = screen.getByRole("option");
      expect(button).toHaveAttribute(
        "aria-label",
        "Japan Adventure, Mar 1 - Mar 10 (currently selected)",
      );
    });

    it("should have aria-label without dates when dates are missing", () => {
      const tripWithoutDates = {
        ...mockTrip,
        start_date: null,
        end_date: null,
      };
      render(<TripItem {...defaultProps} trip={tripWithoutDates} />);

      const button = screen.getByRole("option");
      expect(button).toHaveAttribute("aria-label", "Japan Adventure");
    });

    it("should mark check icon as decorative", () => {
      render(<TripItem {...defaultProps} isSelected={true} />);

      const checkIcon = screen.getByRole("img", { hidden: true });
      expect(checkIcon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long trip titles with truncation", () => {
      const longTitleTrip = {
        ...mockTrip,
        title:
          "This is a very long trip title that should be truncated when displayed in the dropdown",
      };
      render(<TripItem {...defaultProps} trip={longTitleTrip} />);

      const titleElement = screen.getByText(longTitleTrip.title);
      expect(titleElement).toHaveClass("truncate");
    });

    it("should handle invalid date formats gracefully", () => {
      const invalidDateTrip = {
        ...mockTrip,
        start_date: "invalid-date",
        end_date: "also-invalid",
      };
      render(<TripItem {...defaultProps} trip={invalidDateTrip} />);

      // Should display the raw date strings when parsing fails
      expect(
        screen.getByText("invalid-date - also-invalid"),
      ).toBeInTheDocument();
    });

    it("should apply custom className when provided", () => {
      render(<TripItem {...defaultProps} className="custom-class" />);

      const button = screen.getByRole("option");
      expect(button).toHaveClass("custom-class");
    });

    it("should forward ref correctly", () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<TripItem {...defaultProps} ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("Visual States", () => {
    it("should apply hover styles", () => {
      render(<TripItem {...defaultProps} />);

      const button = screen.getByRole("option");
      expect(button).toHaveClass(
        "hover:bg-accent",
        "hover:text-accent-foreground",
      );
    });

    it("should apply focus styles", () => {
      render(<TripItem {...defaultProps} />);

      const button = screen.getByRole("option");
      expect(button).toHaveClass(
        "focus:bg-accent",
        "focus:text-accent-foreground",
        "focus:outline-none",
      );
    });

    it("should have transition classes for smooth interactions", () => {
      render(<TripItem {...defaultProps} />);

      const button = screen.getByRole("option");
      expect(button).toHaveClass("transition-colors");
    });
  });
});
