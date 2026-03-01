import { describe, expect, it, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider, locales, useI18n } from "@/src/lib/i18n";

function LocaleDisplay() {
  const { locale } = useI18n();
  return <span data-testid="locale">{locale}</span>;
}

function HeroTitleDisplay() {
  const { messages } = useI18n();
  return <span data-testid="hero-title">{messages.hero.title}</span>;
}

function LandingCopyDisplay() {
  const { messages } = useI18n();
  return (
    <>
      <span data-testid="hero-subtitle">{messages.hero.subtitle}</span>
      <span data-testid="engine-body">{messages.hero.engineBody}</span>
      <span data-testid="feature-title">{messages.features.items[0]?.title ?? ""}</span>
      <span data-testid="workflow-body">{messages.workflow.steps[0]?.body ?? ""}</span>
      <span data-testid="footer-blurb">{messages.footer.blurb}</span>
    </>
  );
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

  it("renders with initial locale first, then syncs to localized path", async () => {
    window.history.replaceState({}, "", "/de/playground");
    renderWithLocale("en");

    expect(screen.getByTestId("locale").textContent).toBe("en");
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("de"));
  });

  it("sets document direction for rtl locales", async () => {
    renderWithLocale("ar");
    await waitFor(() => expect(document.documentElement.dir).toBe("rtl"));
  });

  it("throws when used outside provider", () => {
    expect(() => render(<LocaleDisplay />)).toThrow(/useI18n/i);
  });

  it("uses the critical-path hero headline in English", async () => {
    render(
      <I18nProvider initialLocale="en">
        <HeroTitleDisplay />
      </I18nProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("hero-title").textContent).toBe(
        "Document infrastructure for the critical path."
      )
    );
  });

  it("does not lead with Typst in localized hero headlines", async () => {
    for (const locale of locales) {
      const view = render(
        <I18nProvider initialLocale={locale}>
          <HeroTitleDisplay />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("hero-title").textContent).toBeTruthy();
      });
      expect(screen.getByTestId("hero-title").textContent).not.toMatch(/typst/i);

      view.unmount();
      cleanup();
    }
  });

  it("keeps Typst as a non-English engine detail, not a landing lead", async () => {
    for (const locale of locales.filter((candidate) => candidate !== "en")) {
      const view = render(
        <I18nProvider initialLocale={locale}>
          <LandingCopyDisplay />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("hero-subtitle").textContent).toBeTruthy();
      });

      expect(screen.getByTestId("hero-subtitle").textContent).toMatch(/rust/i);
      expect(screen.getByTestId("engine-body").textContent).toMatch(/typst/i);
      expect(screen.getByTestId("feature-title").textContent).not.toMatch(/typst/i);
      expect(screen.getByTestId("workflow-body").textContent).not.toMatch(/typst/i);
      expect(screen.getByTestId("footer-blurb").textContent).not.toMatch(/typst/i);

      view.unmount();
      cleanup();
    }
  });
});
