import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen } from "@testing-library/react";
import { RegisterForm } from "@/src/components/auth/RegisterForm";

const mutate = vi.fn();
let registerState = { isPending: false, isError: false, error: null as any };

vi.mock("@/src/hooks/use-auth", () => ({
  useRegister: () => ({ mutate, ...registerState }),
}));

describe("RegisterForm state handling", () => {
  beforeEach(() => {
    mutate.mockReset();
    registerState = { isPending: false, isError: false, error: null };
  });

  it("shows conflict error message", () => {
    registerState = {
      isPending: false,
      isError: true,
      error: { error: "conflict" },
    };
    renderWithProviders(<RegisterForm />);
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
  });

  it("shows unknown error message", () => {
    registerState = {
      isPending: false,
      isError: true,
      error: { error: "unknown_error", message: "Server offline" },
    };
    renderWithProviders(<RegisterForm />);
    expect(screen.getByText(/server offline/i)).toBeInTheDocument();
  });

  it("shows pending state", () => {
    registerState = { isPending: true, isError: false, error: null };
    renderWithProviders(<RegisterForm />);
    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();
  });
});
