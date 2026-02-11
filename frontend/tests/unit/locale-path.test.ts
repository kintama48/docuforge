import { describe, expect, it } from "vitest";
import { stripLocalePath, withLocale, createLocalePath } from "@/src/lib/locale-path";

describe("locale-path", () => {
  it("strips locale prefixes", () => {
    expect(stripLocalePath("/fr/dashboard")).toEqual({ locale: "fr", basePath: "/dashboard" });
    expect(stripLocalePath("dashboard")).toEqual({ locale: null, basePath: "/dashboard" });
    expect(stripLocalePath("/")).toEqual({ locale: null, basePath: "/" });
  });

  it("builds localized paths", () => {
    expect(withLocale("/pricing?plan=pro#top", "en")).toBe("/pricing?plan=pro#top");
    expect(withLocale("/pricing?plan=pro#top", "fr")).toBe("/fr/pricing?plan=pro#top");
    expect(withLocale("/", "de")).toBe("/de");
  });

  it("creates locale path helpers", () => {
    const createEsPath = createLocalePath("es");
    expect(createEsPath("/docs")).toBe("/es/docs");
  });
});
