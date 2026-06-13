import { describe, expect, it } from "vitest";
import { getMarketingMeta } from "@/src/lib/marketing-metadata";
import { locales } from "@/src/lib/i18n-config";

describe("marketing metadata", () => {
  it("uses deterministic-infrastructure framing across locales", () => {
    for (const locale of locales) {
      const meta = getMarketingMeta(locale);
      expect(meta.landing.title.length).toBeGreaterThan(0);
      expect(meta.landing.description.length).toBeGreaterThan(0);
      expect(meta.landing.ogAlt.length).toBeGreaterThan(0);

      expect(meta.landing.title).not.toMatch(/typst/i);
      expect(meta.landing.ogAlt).not.toMatch(/typst/i);
    }
  });

  it("keeps English landing description tied to reality-based value props", () => {
    const en = getMarketingMeta("en");
    expect(en.landing.title).toContain("Generate PDFs via API");
    expect(en.landing.description).toContain("invoices, receipts, and reports");
    expect(en.landing.description).toContain("Rust-powered");
    expect(en.landing.description).toContain("no headless browser");
  });
});
