import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithAppProviders } from "../helpers/render-app";
import PricingPage from "@/src/views/pricing/PricingPage";

vi.mock("@/src/app/components/theme-toggle", () => ({
  ThemeToggle: () => (
    <button type="button" aria-label="Theme toggle mock">
      Theme
    </button>
  ),
}));

describe("PricingPage", () => {
  it("renders pricing heading", () => {
    renderWithAppProviders(<PricingPage />);
    expect(
      screen.getByRole("heading", {
        name: /plans that scale/i,
      })
    ).toBeInTheDocument();
  });
});
