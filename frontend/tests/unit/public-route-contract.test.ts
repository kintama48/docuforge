import { describe, expect, it } from "vitest";
import {
  isConsolePath,
  isMarketingPath,
  publicRoutes,
  publicStaticSitemapRoutes,
} from "@/src/lib/public-route-contract";

describe("public-route-contract", () => {
  it("keeps public routes unique and absolute", () => {
    const routes = Object.values(publicRoutes);

    expect(new Set(routes).size).toBe(routes.length);
    routes.forEach((route) => {
      expect(route.startsWith("/")).toBe(true);
    });
  });

  it("classifies marketing paths and dynamic descendants", () => {
    expect(isMarketingPath("/")).toBe(true);
    expect(isMarketingPath("/pricing")).toBe(true);
    expect(isMarketingPath("/docs/mcp/cursor")).toBe(true);
    expect(isMarketingPath("/blog/example-post")).toBe(true);
    expect(isMarketingPath("/templates/invoice-template")).toBe(true);
    expect(isMarketingPath("/dashboard")).toBe(false);
  });

  it("classifies console paths separately", () => {
    expect(isConsolePath("/dashboard")).toBe(true);
    expect(isConsolePath("/editor/123")).toBe(true);
    expect(isConsolePath("/login")).toBe(true);
    expect(isConsolePath("/pricing")).toBe(false);
  });

  it("only exposes sitemap routes that are public marketing paths", () => {
    publicStaticSitemapRoutes.forEach((route) => {
      expect(isMarketingPath(route)).toBe(true);
      expect(isConsolePath(route)).toBe(false);
    });
  });
});
