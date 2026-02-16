import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../helpers/render";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/src/views/settings/SettingsPage";
import { useAuthStore } from "@/src/stores/auth";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/settings",
}));

describe("settings keys flow", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: "test-jwt",
      user: { id: "usr", email: "test@docuforge.dev", plan: "free" },
    });
  });

  it("creates an API key and shows raw key dialog", async () => {
    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: /create new key/i }));
    fireEvent.change(screen.getByPlaceholderText(/production key/i), {
      target: { value: "Prod" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /save this key/i })
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/docu_live_test_123/i)).toBeInTheDocument();
  });
});
