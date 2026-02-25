import { describe, expect, it } from "vitest";
import {
  getPlaygroundPresetBySlug,
  listPlaygroundPresetSlugs,
  playgroundPresets,
} from "@/src/app/playground/playground-presets";

describe("playground presets", () => {
  it("contains the expected SEO template pages", () => {
    const slugs = listPlaygroundPresetSlugs();

    expect(slugs).toContain("freight-invoice-template");
    expect(slugs).toContain("shopify-invoice-template");
    expect(slugs).toContain("completion-certificate-template");
    expect(slugs).toContain("technical-report-template");

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps preset payloads parseable and guidance available", () => {
    for (const preset of playgroundPresets) {
      expect(() => JSON.parse(preset.data)).not.toThrow();
      expect(preset.hints.length).toBeGreaterThan(0);
      expect(preset.seoTitle.length).toBeGreaterThan(20);
      expect(preset.seoDescription.length).toBeGreaterThan(40);
    }
  });

  it("resolves presets by slug and legacy id", () => {
    const bySlug = getPlaygroundPresetBySlug("freight-invoice-template");
    const byId = getPlaygroundPresetBySlug("freight-invoice");

    expect(bySlug?.id).toBe("freight-invoice");
    expect(byId?.slug).toBe("freight-invoice-template");
    expect(getPlaygroundPresetBySlug("does-not-exist")).toBeUndefined();
  });
});
