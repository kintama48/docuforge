import { describe, expect, it } from "vitest";
import {
  collectLowCodeFields,
  getGuidedTemplatePreset,
  inferLowCodeDefaults,
  listGuidedTemplatePresets,
} from "@/src/lib/low-code";

describe("low-code presets", () => {
  it("lists guided presets", () => {
    const presets = listGuidedTemplatePresets();
    expect(presets.length).toBeGreaterThan(0);
    expect(presets.map((preset) => preset.id)).toContain("guided-invoice");
  });

  it("returns cloned preset payloads", () => {
    const first = getGuidedTemplatePreset("guided-invoice");
    const second = getGuidedTemplatePreset("guided-invoice");

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).not.toBe(second);
    expect(first?.spec).toEqual(second?.spec);
  });

  it("returns null for unknown preset ids", () => {
    expect(getGuidedTemplatePreset("missing")).toBeNull();
  });

  it("collects low-code dynamic fields", () => {
    const spec = {
      version: 1 as const,
      blocks: [
        { type: "header" as const, props: { title: "{{invoice.title}}" } },
        {
          type: "line_items_table" as const,
          props: { items_path: "items", columns: ["name", "qty"] as const },
        },
      ],
    };
    expect(collectLowCodeFields(spec)).toEqual([
      "invoice.title",
      "items",
      "items[].name",
      "items[].qty",
    ]);
  });

  it("infers nested defaults from low-code fields", () => {
    const spec = {
      version: 1 as const,
      blocks: [
        { type: "header" as const, props: { title: "{{customer.name}}" } },
        {
          type: "line_items_table" as const,
          props: { items_path: "items", columns: ["name"] as const },
        },
      ],
    };
    expect(inferLowCodeDefaults(spec)).toEqual({
      customer: { name: "" },
      items: [{ name: "" }],
    });
  });
});
