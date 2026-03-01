import { describe, expect, it } from "vitest";
import {
  getCollectionMeta,
  getContentBySlug,
  listAllContentPaths,
  listContent,
} from "@/src/lib/content-hub";
import { locales } from "@/src/lib/i18n-config";

describe("content hub", () => {
  it("builds the expected amount of SEO pages", () => {
    const blog = listContent("blog", "en");
    const templates = listContent("templates", "en");
    const compare = listContent("compare", "en");
    const industries = listContent("industries", "en");

    expect(blog.length).toBe(21);
    expect(templates.length).toBe(15);
    expect(compare.length).toBe(7);
    expect(industries.length).toBe(7);
    expect(listAllContentPaths().length).toBe(50);
  });

  it("returns localized content for every supported locale", () => {
    for (const locale of locales) {
      const blog = listContent("blog", locale);
      const template = listContent("templates", locale);
      expect(blog[0]?.title).toBeTruthy();
      expect(template[0]?.title).toBeTruthy();
    }
  });

  it("supports priority pages and slug lookup", () => {
    const topTemplates = listContent("templates", "en").slice(0, 4).map((item) => item.slug);
    expect(topTemplates).toContain("invoice");
    expect(topTemplates).toContain("shipping-label");
    expect(topTemplates).toContain("receipt");
    expect(topTemplates).toContain("certificate");

    const doc = getContentBySlug("compare", "puppeteer", "en");
    expect(doc?.priority).toBe(true);
    expect(getContentBySlug("blog", "does-not-exist", "en")).toBeNull();
  });

  it("keeps compare positioning deterministic-pipeline-first", () => {
    const meta = getCollectionMeta("compare", "en");
    expect(meta.title).toContain("Deterministic document pipeline");

    const doc = getContentBySlug("compare", "puppeteer", "en");
    expect(doc).not.toBeNull();
    expect(doc?.excerpt).toContain("deterministic API throughput");
    expect(doc?.excerpt).not.toContain("Typst-first");
  });
});
