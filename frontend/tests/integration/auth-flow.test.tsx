import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import { LoginForm } from "@/src/components/auth/LoginForm";
import { useAuthStore } from "@/src/stores/auth";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("redirect=/dashboard"),
}));

describe("auth flow", () => {
  it("logs in and updates auth store", async () => {
    renderWithProviders(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@docuforge.dev" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(useAuthStore.getState().token).toBe("test-jwt")
    );
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });
});
