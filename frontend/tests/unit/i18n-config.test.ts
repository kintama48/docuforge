import { describe, expect, it } from "vitest";
import { normalizeLocale, isRtl } from "@/src/lib/i18n-config";

describe("i18n-config", () => {
  it("normalizes locale prefixes", () => {
    expect(normalizeLocale(null)).toBe("en");
    expect(normalizeLocale("fr-CA")).toBe("fr");
    expect(normalizeLocale("de")).toBe("de");
    expect(normalizeLocale("it")).toBe("it");
    expect(normalizeLocale("es-MX")).toBe("es");
    expect(normalizeLocale("ar")).toBe("ar");
    expect(normalizeLocale("zh-CN")).toBe("zh");
    expect(normalizeLocale("unknown")).toBe("en");
  });

  it("detects rtl locales", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });
});
