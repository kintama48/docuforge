import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { I18nProvider, useI18n } from "@/src/lib/i18n";

function LocaleDisplay() {
  const { locale } = useI18n();
  return <span data-testid="locale">{locale}</span>;
}

function renderWithLocale(initialLocale?: any) {
  render(
    <I18nProvider initialLocale={initialLocale}>
      <LocaleDisplay />
    </I18nProvider>
  );
}

describe("I18nProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("uses locale from path", async () => {
    window.history.replaceState({}, "", "/fr/dashboard");
    renderWithLocale();
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("fr"));
  });

  it("uses locale from query", async () => {
    window.history.replaceState({}, "", "/dashboard?lang=de");
    renderWithLocale();
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("de"));
  });

  it("uses locale from storage", async () => {
    localStorage.setItem("docuforge-locale", "it");
    renderWithLocale();
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("it"));
  });

  it("falls back to navigator language", async () => {
    Object.defineProperty(navigator, "language", {
      value: "es-ES",
      configurable: true,
    });
    renderWithLocale();
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("es"));
  });

  it("uses provided initial locale", async () => {
    renderWithLocale("zh");
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("zh"));
  });

  it("sets document direction for rtl locales", async () => {
    renderWithLocale("ar");
    await waitFor(() => expect(document.documentElement.dir).toBe("rtl"));
  });

  it("throws when used outside provider", () => {
    expect(() => render(<LocaleDisplay />)).toThrow(/useI18n/i);
  });
});
