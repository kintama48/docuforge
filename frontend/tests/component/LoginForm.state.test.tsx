import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen } from "@testing-library/react";
import { LoginForm } from "@/src/components/auth/LoginForm";

const mutate = vi.fn();
const mutateAsync = vi.fn();
const reset = vi.fn();
let loginState = { isPending: false, isError: false, error: null as any };
const idleMutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  error: null as any,
};

vi.mock("@/src/hooks/use-auth", () => ({
  useLogin: () => ({ mutate, mutateAsync, reset, ...loginState }),
  useVerifyEmail: () => idleMutation,
  useResendEmailVerification: () => idleMutation,
  useVerifyTwoFactor: () => idleMutation,
  useResendTwoFactor: () => idleMutation,
  isVerificationRequiredResponse: () => false,
  isTwoFactorRequiredResponse: () => false,
  extractApiErrorMessage: (error: unknown, fallback: string) =>
    (error as { message?: string } | null)?.message || fallback,
}));

describe("LoginForm state handling", () => {
  beforeEach(() => {
    mutate.mockReset();
    mutateAsync.mockReset();
    reset.mockReset();
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
