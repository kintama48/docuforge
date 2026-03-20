import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../../helpers/render";
import { TopBar } from "@/src/components/layout/TopBar";
import { useAuthStore } from "@/src/stores/auth";

vi.mock("@/src/app/components/theme-toggle", () => ({
  ThemeToggle: () => (
    <button type="button" aria-label="Theme toggle mock">
      Theme
    </button>
  ),
}));

describe("TopBar", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: "jwt-token",
      user: { id: "usr_1", email: "dev@docuforge.dev", plan: "free" },
    });
  });

  it("shows a logout button and clears auth state", () => {
    const onOpenNavigation = vi.fn();
    renderWithProviders(<TopBar onOpenNavigation={onOpenNavigation} />);

    fireEvent.click(screen.getByRole("button", { name: /open navigation/i }));
    expect(onOpenNavigation).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
