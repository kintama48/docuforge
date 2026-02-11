import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen } from "@testing-library/react";
import { LoginForm } from "@/src/components/auth/LoginForm";

const mutate = vi.fn();
let loginState = { isPending: false, isError: false, error: null as any };

vi.mock("@/src/hooks/use-auth", () => ({
  useLogin: () => ({ mutate, ...loginState }),
}));

describe("LoginForm state handling", () => {
  beforeEach(() => {
    mutate.mockReset();
    loginState = { isPending: false, isError: false, error: null };
  });

  it("shows pending state", () => {
    loginState = { isPending: true, isError: false, error: null };
    renderWithProviders(<LoginForm />);
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });

  it("shows unknown error message", () => {
    loginState = {
      isPending: false,
      isError: true,
      error: { error: "unknown_error", message: "API down" },
    };
    renderWithProviders(<LoginForm />);
    expect(screen.getByText(/api down/i)).toBeInTheDocument();
  });
});
