import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../helpers/render";
import SettingsPage from "@/src/pages/settings/SettingsPage";
import { useAuthStore } from "@/src/stores/auth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/settings",
}));

describe("billing flow", () => {
  let originalLocation: Location;

  beforeEach(() => {
    useAuthStore.setState({
      token: "test-jwt",
      user: { id: "usr", email: "test@docuforge.dev", plan: "free" },
    });

    originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: "http://localhost/" };
  });

  afterEach(() => {
    delete (window as any).location;
    (window as any).location = originalLocation;
  });

  it("redirects to checkout on upgrade", async () => {
    renderWithProviders(<SettingsPage />);

    const buttons = screen.getAllByRole("button", { name: /upgrade to starter/i });
    fireEvent.click(buttons[0]);

    await waitFor(() =>
      expect(window.location.href).toBe("https://checkout.example.com")
    );
  });
});
