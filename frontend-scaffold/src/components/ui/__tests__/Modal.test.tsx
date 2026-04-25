import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "../Modal";

describe("Modal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Hidden</p>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders children when isOpen is true", () => {
    render(
      <Modal isOpen onClose={() => {}}>
        <p data-testid="modal-body">Content</p>
      </Modal>,
    );
    expect(screen.getByTestId("modal-body")).toBeInTheDocument();
  });

  it("renders the title and a close button when title is provided", () => {
    render(
      <Modal isOpen onClose={() => {}} title="Send a tip">
        <p>x</p>
      </Modal>,
    );
    expect(screen.getByRole("heading", { name: "Send a tip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close modal/i })).toBeInTheDocument();
  });

  it("omits the close button when no title is provided", () => {
    render(
      <Modal isOpen onClose={() => {}}>
        <p>x</p>
      </Modal>,
    );
    expect(screen.queryByRole("button", { name: /close modal/i })).toBeNull();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Hi">
        <p>x</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: /close modal/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <p>x</p>
      </Modal>,
    );
    // Backdrop has role="presentation".
    await userEvent.click(screen.getByRole("presentation"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses dialog ARIA semantics with aria-modal=true", () => {
    render(
      <Modal isOpen onClose={() => {}} title="Confirm">
        <p>x</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Confirm");
  });
});
