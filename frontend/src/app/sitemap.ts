import type { MetadataRoute } from "next";
import { env } from "@/src/config/env";
import { locales } from "@/src/lib/i18n-config";
import { withLocale } from "@/src/lib/locale-path";
import { listAllContentPaths } from "@/src/lib/content-hub";

function absolute(path: string) {
  const base = env.marketingUrl.endsWith("/")
    ? env.marketingUrl.slice(0, -1)
    : env.marketingUrl;
  return `${base}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const baseRoutes = ["/", "/pricing", "/docs", "/playground", "/blog", "/templates", "/compare", "/industries"];

  const localizedBase = locales.flatMap((locale) =>
    baseRoutes.map((path) => ({
      url: absolute(withLocale(path, locale)),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.8,
    }))
  );

  const contentRoutes = listAllContentPaths().flatMap(({ collection, slug }) =>
    locales.map((locale) => ({
      url: absolute(withLocale(`/${collection}/${slug}`, locale)),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  return [...localizedBase, ...contentRoutes];
}
