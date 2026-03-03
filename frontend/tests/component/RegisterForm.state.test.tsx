import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen } from "@testing-library/react";
import { RegisterForm } from "@/src/components/auth/RegisterForm";

const mutate = vi.fn();
const mutateAsync = vi.fn();
const reset = vi.fn();
let registerState = { isPending: false, isError: false, error: null as any };
const idleMutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  error: null as any,
};

vi.mock("@/src/hooks/use-auth", () => ({
  useRegister: () => ({ mutate, mutateAsync, reset, ...registerState }),
  useVerifyEmail: () => idleMutation,
  useResendEmailVerification: () => idleMutation,
  isVerificationRequiredResponse: () => false,
  extractApiErrorMessage: (error: unknown, fallback: string) =>
    (error as { message?: string } | null)?.message || fallback,
}));

describe("RegisterForm state handling", () => {
  beforeEach(() => {
    mutate.mockReset();
    mutateAsync.mockReset();
    reset.mockReset();
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
