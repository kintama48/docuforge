import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { RegisterForm } from "@/src/components/auth/RegisterForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("RegisterForm", () => {
  it("validates password length", async () => {
    renderWithProviders(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@docuforge.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/at least 8 characters/i)
      ).toBeInTheDocument()
    );
  });

  it("validates password match", async () => {
    renderWithProviders(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@docuforge.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "password321" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    );
  });
});
