import { describe, expect, it } from "vitest";
import { resolveRouteLocale } from "@/src/lib/locale-routing";

describe("locale-routing", () => {
  it("rewrites localized routes to the underlying base path", () => {
    expect(
      resolveRouteLocale({
        basePath: "/blog",
        pathLocale: "fr",
        requestedLocale: null,
        cookieLocale: null,
        acceptLanguage: null,
        consoleRequest: false,
      })
    ).toEqual({
      kind: "serve",
      locale: "fr",
      persistLocale: "fr",
      rewriteToBasePath: true,
      varyOnCookie: false,
      varyOnAcceptLanguage: false,
    });
  });

  it("auto-detects locale only on the root marketing entry point", () => {
    expect(
      resolveRouteLocale({
        basePath: "/",
        pathLocale: null,
        requestedLocale: null,
        cookieLocale: "de",
        acceptLanguage: "fr-FR,fr;q=0.9",
        consoleRequest: false,
      })
    ).toMatchObject({
      kind: "redirect",
      locale: "de",
      redirectPath: "/de",
      status: 307,
      persistLocale: "de",
      varyOnCookie: true,
      varyOnAcceptLanguage: true,
    });
  });

  it("keeps unprefixed public deep links on english even when a locale cookie exists", () => {
    expect(
      resolveRouteLocale({
        basePath: "/pricing",
        pathLocale: null,
        requestedLocale: null,
        cookieLocale: "fr",
        acceptLanguage: "fr-FR,fr;q=0.9",
        consoleRequest: false,
      })
    ).toEqual({
      kind: "serve",
      locale: "en",
      persistLocale: null,
      rewriteToBasePath: false,
      varyOnCookie: false,
      varyOnAcceptLanguage: false,
    });
  });

  it("allows console routes to honor locale preference without redirecting", () => {
    expect(
      resolveRouteLocale({
        basePath: "/dashboard",
        pathLocale: null,
        requestedLocale: null,
        cookieLocale: "it",
        acceptLanguage: "de-DE,de;q=0.9",
        consoleRequest: true,
      })
    ).toEqual({
      kind: "serve",
      locale: "it",
      persistLocale: null,
      rewriteToBasePath: false,
      varyOnCookie: true,
      varyOnAcceptLanguage: true,
    });
  });

  it("normalizes explicit english locale prefixes back to unprefixed canonicals", () => {
    expect(
      resolveRouteLocale({
        basePath: "/docs",
        pathLocale: "en",
        requestedLocale: null,
        cookieLocale: null,
        acceptLanguage: null,
        consoleRequest: false,
      })
    ).toEqual({
      kind: "redirect",
      locale: "en",
      redirectPath: "/docs",
      status: 308,
      persistLocale: "en",
      varyOnCookie: false,
      varyOnAcceptLanguage: false,
    });
  });
});
