import { describe, expect, it } from "vitest";
import {
  buildPublicLanguageAlternates,
  buildPublicMetadata,
} from "@/src/lib/public-seo";

describe("public-seo", () => {
  it("builds locale alternates from the unlocalized route pathname", () => {
    expect(buildPublicLanguageAlternates("/blog")).toEqual({
      "x-default": "/blog",
      en: "/blog",
      fr: "/fr/blog",
      de: "/de/blog",
      it: "/it/blog",
      es: "/es/blog",
      ar: "/ar/blog",
      zh: "/zh/blog",
    });
  });

  it("builds canonical and open graph urls for localized public pages", () => {
    const metadata = buildPublicMetadata({
      locale: "fr",
      pathname: "/docs",
      title: "Docs",
      description: "Public API docs",
      ogImage: "/og/docs/fr",
      ogAlt: "Docs",
    });

    expect(metadata.title).toEqual({ absolute: "Docs" });
    expect(metadata.alternates?.canonical).toBe("/fr/docs");
    expect(metadata.alternates?.languages).toMatchObject({
      "x-default": "/docs",
      fr: "/fr/docs",
      de: "/de/docs",
    });
    expect(metadata.openGraph?.url).toMatch(/\/fr\/docs$/);
    expect(metadata.twitter?.images).toEqual(["/og/docs/fr"]);
  });
});
