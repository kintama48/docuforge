import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithAppProviders } from "../helpers/render-app";
import { SiteFooter } from "@/src/app/components/site-footer";

describe("SiteFooter", () => {
  it("renders the localized public route contract on localized pages", () => {
    window.history.replaceState({}, "", "/fr/docs");
    renderWithAppProviders(<SiteFooter />);

    expect(screen.getByRole("link", { name: /fonctionnalités/i })).toHaveAttribute(
      "href",
      "/fr#features"
    );
    expect(screen.getByRole("link", { name: /tarifs/i })).toHaveAttribute(
      "href",
      "/fr/pricing"
    );
    expect(screen.getByRole("link", { name: /blog/i })).toHaveAttribute(
      "href",
      "/fr/blog"
    );
    expect(screen.getByRole("link", { name: /conditions/i })).toHaveAttribute(
      "href",
      "/fr/terms"
    );
  });
});
