import { describe, expect, it } from "vitest";
import sitemap from "@/src/app/sitemap";

describe("sitemap playground entries", () => {
  it("contains localized SEO routes for playground template pages", () => {
    const entries = sitemap();

    expect(
      entries.some((entry) => entry.url.endsWith("/playground/freight-invoice-template"))
    ).toBe(true);
    expect(
      entries.some((entry) => entry.url.endsWith("/de/playground/freight-invoice-template"))
    ).toBe(true);
    expect(
      entries.some((entry) => entry.url.endsWith("/playground/shopify-invoice-template"))
    ).toBe(true);
  });
});
