import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

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

  it("updates nav links to localized paths on localized routes", async () => {
    window.history.replaceState({}, "", "/de/playground");
    renderWithAppProviders(<SiteHeader />);

    await waitFor(() => {
      expect(
        screen.getByRole("link", {
          name: /funktionen/i,
        })
      ).toHaveAttribute("href", "/de#features");
    });

    expect(
      screen.getByRole("link", {
        name: /docuforge/i,
      })
    ).toHaveAttribute("href", "/de");

    expect(
      screen.getByRole("link", {
        name: /playground/i,
      })
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks the blog index active without marking blog articles active", () => {
    window.history.replaceState({}, "", "/blog");
    const { unmount } = renderWithAppProviders(<SiteHeader />);

    expect(
      screen.getByRole("link", {
        name: /blog/i,
      })
    ).toHaveAttribute("aria-current", "page");

    unmount();
    window.history.replaceState({}, "", "/blog/pdf-api-patterns");
    renderWithAppProviders(<SiteHeader />);

    expect(
      screen.getByRole("link", {
        name: /blog/i,
      })
    ).not.toHaveAttribute("aria-current");
  });
});
