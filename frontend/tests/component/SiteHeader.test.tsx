import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithAppProviders } from "../helpers/render-app";
import { SiteHeader } from "@/src/app/components/site-header";

vi.mock("@/src/app/components/theme-toggle", () => ({
  ThemeToggle: () => (
    <button type="button" aria-label="Theme toggle mock">
      Theme
    </button>
  ),
}));

describe("SiteHeader", () => {
  it("renders DocuForge lockup and stable CTA button classes", () => {
    renderWithAppProviders(<SiteHeader />);

    expect(
      screen.getByRole("link", {
        name: /docuforge/i,
      })
    ).toBeInTheDocument();

    const readDocs = screen.getByRole("link", {
      name: /read docs/i,
    });
    const openConsole = screen.getByRole("link", {
      name: /open console/i,
    });

    expect(readDocs).toHaveClass("btn", "btn-secondary");
    expect(openConsole).toHaveClass("btn", "btn-primary");
  });
});
