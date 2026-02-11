import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/src/lib/theme";

function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme("light")}>Light</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when used outside provider", () => {
    expect(() => render(<ThemeConsumer />)).toThrow(/ThemeProvider/i);
  });

  it("hydrates from localStorage and applies theme", async () => {
    localStorage.setItem("docuforge-theme", "dark");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark")
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("uses system theme when set to system", async () => {
    const media = vi.fn().mockReturnValue({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    });
    vi.stubGlobal("matchMedia", media);

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("dark")
    );
    expect(screen.getByTestId("resolved").textContent).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: /light/i }));
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("light")
    );
  });
});
