import { describe, expect, it } from "vitest";
import {
  getAllStaticContentRoutes,
  getContentItemsBySection,
  getLocalizedContentItem,
  getSectionIndex,
  getLocalizedNavLabels,
} from "@/src/lib/content-hub";

describe("content hub factory", () => {
  it("creates all requested page families", () => {
    expect(getContentItemsBySection("templates")).toHaveLength(15);
    expect(getContentItemsBySection("compare")).toHaveLength(7);
    expect(getContentItemsBySection("industries")).toHaveLength(7);
    expect(getContentItemsBySection("blog").length).toBeGreaterThanOrEqual(18);
  });

  it("includes high-priority buyer-intent pages", () => {
    const invoiceTemplate = getLocalizedContentItem("templates", "invoice", "en");
    const shippingTemplate = getLocalizedContentItem("templates", "shipping-label", "en");
    const receiptTemplate = getLocalizedContentItem("templates", "receipt", "en");
    const certificateTemplate = getLocalizedContentItem("templates", "certificate", "en");
    const puppeteerComparison = getLocalizedContentItem("compare", "puppeteer-pdf-generation", "en");

    expect(invoiceTemplate?.isPriority).toBe(true);
    expect(shippingTemplate?.isPriority).toBe(true);
    expect(receiptTemplate?.isPriority).toBe(true);
    expect(certificateTemplate?.isPriority).toBe(true);
    expect(puppeteerComparison?.isPriority).toBe(true);
  });

  it("localizes titles and navigation labels", () => {
    const arabicTemplate = getLocalizedContentItem("templates", "invoice", "ar");
    const chineseComparison = getLocalizedContentItem("compare", "puppeteer-pdf-generation", "zh");

    expect(arabicTemplate?.title).toMatch(/قالب PDF/);
    expect(chineseComparison?.title).toContain("DocuForge");

    const navAr = getLocalizedNavLabels("ar");
    expect(navAr.blog).toBe("المدونة");
  });

  it("builds section indexes and stable routes", () => {
    const index = getSectionIndex("blog", "en");
    const routes = getAllStaticContentRoutes();

    expect(index.items.length).toBeGreaterThan(10);
    expect(routes).toContain("/templates/invoice");
    expect(routes).toContain("/compare/puppeteer-pdf-generation");
  });
});
