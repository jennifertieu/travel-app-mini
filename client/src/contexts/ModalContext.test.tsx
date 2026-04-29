import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ModalProvider, useModal } from "./ModalContext";

function TestConsumer() {
  const { openModal, closeModal, activeModal, modalOptions } = useModal();
  return (
    <div>
      <span data-testid="modal">{activeModal ?? "none"}</span>
      <span data-testid="tripId">{(modalOptions.tripId as string) ?? ""}</span>
      <button onClick={() => openModal("inviteLink", { tripId: "t1" })}>open</button>
      <button onClick={closeModal}>close</button>
    </div>
  );
}

describe("ModalContext", () => {
  it("starts with no active modal", () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    );
    expect(screen.getByTestId("modal").textContent).toBe("none");
  });

  it("opens a modal by name and stores options", async () => {
    const user = userEvent.setup();
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    );
    await user.click(screen.getByText("open"));
    expect(screen.getByTestId("modal").textContent).toBe("inviteLink");
    expect(screen.getByTestId("tripId").textContent).toBe("t1");
  });

  it("closes the active modal and clears options", async () => {
    const user = userEvent.setup();
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>,
    );
    await user.click(screen.getByText("open"));
    await user.click(screen.getByText("close"));
    expect(screen.getByTestId("modal").textContent).toBe("none");
    expect(screen.getByTestId("tripId").textContent).toBe("");
  });

  it("throws when used outside ModalProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useModal must be used within ModalProvider",
    );
    spy.mockRestore();
  });
});
